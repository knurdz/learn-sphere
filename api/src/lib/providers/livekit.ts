import { AccessToken, RoomAgentDispatch, RoomConfiguration } from "livekit-server-sdk";
import { requiredServerEnv } from "@/lib/providers/config";

export const TUTOR_AGENT_NAME = "learnsphere-tutor";

const LEARNER_TOKEN_TTL = "20m";

export function livekitConfigured() {
  return Boolean(
    process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET,
  );
}

export function roomNameForSession(sessionId: string) {
  return `learnsphere-${sessionId}`;
}

/**
 * Mints a learner token that also dispatches the tutor worker into the room.
 * The worker runs under an explicit agent name, so it only joins rooms whose
 * token carries this dispatch. The dispatch metadata hands the worker the
 * learner's Supabase token so it can read its briefing and save the transcript
 * under the same row-level security rules as the app.
 */
export async function createLearnerToken(input: {
  sessionId: string;
  userId: string;
  displayName: string;
  supabaseAccessToken: string;
  locale?: string;
  sttLanguage?: string;
  ttsModel?: string;
  ttsVoice?: string;
  ttsLanguage?: string;
}) {
  const url = requiredServerEnv("LIVEKIT_URL");
  const token = new AccessToken(
    requiredServerEnv("LIVEKIT_API_KEY"),
    requiredServerEnv("LIVEKIT_API_SECRET"),
    {
      identity: `learner-${input.userId}`,
      name: input.displayName,
      ttl: LEARNER_TOKEN_TTL,
    },
  );

  const room = roomNameForSession(input.sessionId);
  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  token.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: TUTOR_AGENT_NAME,
        metadata: JSON.stringify({
          sessionId: input.sessionId,
          supabaseAccessToken: input.supabaseAccessToken,
          locale: input.locale ?? "en",
          sttLanguage: input.sttLanguage,
          ttsModel: input.ttsModel,
          ttsVoice: input.ttsVoice,
          ttsLanguage: input.ttsLanguage,
        }),
      }),
    ],
  });

  return { url, room, token: await token.toJwt() };
}
