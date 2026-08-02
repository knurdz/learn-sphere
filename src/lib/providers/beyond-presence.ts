import { requiredServerEnv } from "./config";

type BeyondPresenceAgent = {
  id: string;
  name?: string;
  avatar_id?: string;
  system_prompt?: string;
  language?: string;
  greeting?: string;
  max_session_length_minutes?: number;
  capabilities?: Array<Record<string, unknown>>;
  llm?: Record<string, unknown>;
};

type BeyondPresenceCall = {
  id?: string;
  livekit_url?: string;
  livekit_token?: string;
};

type BeyondPresenceError = {
  error?: string;
  detail?: string;
};

function getApiConfig() {
  return {
    apiKey: requiredServerEnv("BEYOND_PRESENCE_API_KEY"),
    baseUrl: process.env.BEYOND_PRESENCE_API_URL || "https://api.bey.dev",
  };
}

async function parseResponse<T>(response: Response) {
  return (await response.json().catch(() => null)) as (T & BeyondPresenceError) | null;
}

async function deleteAgent(baseUrl: string, apiKey: string, agentId: string) {
  await fetch(`${baseUrl}/v1/agents/${encodeURIComponent(agentId)}`, {
    method: "DELETE",
    headers: { "x-api-key": apiKey },
  }).catch(() => undefined);
}

function isManagedIframeOnlyPlan(response: Response, body: BeyondPresenceError | null) {
  const message = `${body?.error || ""} ${body?.detail || ""}`.toLowerCase();
  return (
    response.status === 402 ||
    response.status === 403 ||
    message.includes("growth plan") ||
    message.includes("programmatic call") ||
    message.includes("api call creation")
  );
}

export async function createBeyondPresenceSession(input: {
  agentId: string;
  instructions: string;
  greeting: string;
  enableWebcamVision?: boolean;
}) {
  const config = getApiConfig();
  const headers = {
    "x-api-key": config.apiKey,
    "Content-Type": "application/json",
  };

  const baseResponse = await fetch(
    `${config.baseUrl}/v1/agents/${encodeURIComponent(input.agentId)}`,
    { headers },
  );
  const baseAgent = await parseResponse<BeyondPresenceAgent>(baseResponse);
  if (!baseResponse.ok || !baseAgent?.avatar_id) {
    throw new Error(
      baseAgent?.error || baseAgent?.detail || "Could not load the Beyond Presence agent.",
    );
  }

  let createdAgentId = "";
  try {
    const capabilities = [...(baseAgent.capabilities || [])];
    if (
      input.enableWebcamVision &&
      !capabilities.some((capability) => capability.type === "webcam_vision")
    ) {
      capabilities.push({ type: "webcam_vision" });
    }

    const createResponse = await fetch(`${config.baseUrl}/v1/agents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `${baseAgent.name || "LearnSphere Tutor"} lesson`.slice(0, 100),
        avatar_id: baseAgent.avatar_id,
        system_prompt: `${baseAgent.system_prompt || ""}\n\n${input.instructions}`.slice(0, 10000),
        language: baseAgent.language || "en",
        greeting: input.greeting.slice(0, 1000),
        max_session_length_minutes: Math.min(baseAgent.max_session_length_minutes || 30, 30),
        capabilities,
        llm: baseAgent.llm || { type: "openai" },
      }),
    });
    const createdAgent = await parseResponse<BeyondPresenceAgent>(createResponse);
    if (!createResponse.ok || !createdAgent?.id) {
      throw new Error(
        createdAgent?.error || createdAgent?.detail || "Beyond Presence could not create a teaching agent.",
      );
    }
    createdAgentId = createdAgent.id;

    const callResponse = await fetch(`${config.baseUrl}/v1/calls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        agent_id: createdAgent.id,
        tags: { source: "learnsphere" },
      }),
    });
    const call = await parseResponse<BeyondPresenceCall>(callResponse);
    if (!callResponse.ok || !call?.id || !call.livekit_url || !call.livekit_token) {
      if (isManagedIframeOnlyPlan(callResponse, call)) {
        return {
          agentId: createdAgent.id,
          transport: "iframe" as const,
          webcamVisionEnabled: Boolean(input.enableWebcamVision),
          url: `https://bey.chat/${createdAgent.id}`,
        };
      }
      throw new Error(
        call?.error || call?.detail || "Beyond Presence did not return LiveKit connection credentials.",
      );
    }

    return {
      agentId: createdAgent.id,
      callId: call.id,
      livekitUrl: call.livekit_url,
      livekitToken: call.livekit_token,
      webcamVisionEnabled: Boolean(input.enableWebcamVision),
      url: `https://bey.chat/${createdAgent.id}`,
    };
  } catch (error) {
    if (createdAgentId) await deleteAgent(config.baseUrl, config.apiKey, createdAgentId);
    throw error;
  }
}

export async function deleteBeyondPresenceSession(input: {
  agentId: string;
  baseAgentId: string;
}) {
  if (input.agentId === input.baseAgentId) {
    throw new Error("The configured Beyond Presence agent cannot be deleted.");
  }

  const config = getApiConfig();
  const response = await fetch(
    `${config.baseUrl}/v1/agents/${encodeURIComponent(input.agentId)}`,
    {
      method: "DELETE",
      headers: { "x-api-key": config.apiKey },
    },
  );
  if (!response.ok && response.status !== 404) {
    const body = await parseResponse<BeyondPresenceAgent>(response);
    throw new Error(body?.error || body?.detail || "Could not stop the Beyond Presence session.");
  }
}
