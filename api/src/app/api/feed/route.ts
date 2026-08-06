import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  learningFeedKinds,
  redactLearningPayload,
  sortLearningFeedItems,
} from "@/lib/learning-feed";
import { loadMemeTemplates, memeTemplateDimensions } from "@/lib/meme-generator";
import { resolvePublicOrigin } from "@/lib/request-origin";
import { getAuthContext } from "@/lib/supabase/server";
import type { LearningFeedKind } from "@/lib/supabase/database";

const uuidSchema = z.string().uuid();

type MemeLayout = {
  imageUrl: string;
  width: number;
  height: number;
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
  slots: Array<{
    name: string;
    caption: string;
    box: [number, number, number, number];
    fontSize: number;
  }>;
};

async function buildMemeLayout(input: {
  payload: unknown;
  origin: string;
  config: Awaited<ReturnType<typeof loadMemeTemplates>> | null;
}): Promise<MemeLayout | null> {
  if (!input.config) return null;
  const payload = input.payload as
    | { template_id?: string; captions?: Record<string, string> }
    | null;
  const template = payload?.template_id ? input.config[payload.template_id] : undefined;
  if (!template) return null;

  const { width, height } = await memeTemplateDimensions(template.file);
  return {
    imageUrl: new URL(`/meme-templates/${template.file}`, input.origin).toString(),
    width,
    height,
    textColor: template.text_color || "white",
    strokeColor: template.stroke_color || "black",
    strokeWidth: template.stroke_width ?? 3,
    slots: template.slots.map((slot) => ({
      name: slot.name,
      caption: payload?.captions?.[slot.name] ?? "",
      box: slot.box,
      fontSize: slot.max_font || template.max_font || 36,
    })),
  };
}

export async function GET(request: NextRequest) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const spaceParam = params.get("studySpaceId");
  const kindParam = params.get("kind");
  const limit = Math.min(Math.max(Number(params.get("limit") || 20), 1), 80);
  const cursorParam = params.get("cursor");

  if (spaceParam && !uuidSchema.safeParse(spaceParam).success) {
    return NextResponse.json({ error: "Invalid study space." }, { status: 400 });
  }
  if (kindParam && !learningFeedKinds.includes(kindParam as LearningFeedKind)) {
    return NextResponse.json({ error: "Invalid feed category." }, { status: 400 });
  }
  if (cursorParam && Number.isNaN(Date.parse(cursorParam))) {
    return NextResponse.json({ error: "Invalid feed cursor." }, { status: 400 });
  }

  let query = context.supabase
    .from("study_artifacts")
    .select("*")
    .eq("user_id", context.user.id)
    .in("kind", [...learningFeedKinds])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (spaceParam) query = query.eq("study_space_id", spaceParam);
  if (kindParam) query = query.eq("kind", kindParam as LearningFeedKind);
  if (cursorParam) query = query.lt("created_at", cursorParam);

  const { data: artifacts, error: artifactError } = await query;
  if (artifactError) {
    return NextResponse.json({ error: artifactError.message }, { status: 500 });
  }

  const spaceIds = [...new Set((artifacts ?? []).map((artifact) => artifact.study_space_id))];
  const materialIds = [
    ...new Set(
      (artifacts ?? [])
        .map((artifact) => artifact.material_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const artifactIds = (artifacts ?? []).map((artifact) => artifact.id);
  const { data: progressRows, error: progressError } = artifactIds.length
    ? await context.supabase
        .from("learning_progress")
        .select("artifact_id,completed_at,last_score")
        .eq("user_id", context.user.id)
        .in("artifact_id", artifactIds)
    : { data: [], error: null };

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 });
  }

  const { data: attemptsRows, error: attemptsError } = artifactIds.length
    ? await context.supabase
        .from("study_attempts")
        .select("artifact_id,answers,created_at")
        .eq("user_id", context.user.id)
        .in("artifact_id", artifactIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  const latestAttempts = new Map<string, { answer: unknown }>();
  for (const attempt of attemptsRows ?? []) {
    if (latestAttempts.has(attempt.artifact_id)) continue;
    const answers =
      attempt.answers && typeof attempt.answers === "object" && !Array.isArray(attempt.answers)
        ? (attempt.answers as { answer?: unknown })
        : {};
    latestAttempts.set(attempt.artifact_id, { answer: answers.answer });
  }

  const progressMap = new Map(
    (progressRows ?? []).map((progress) => [
      progress.artifact_id,
      {
        completedAt: progress.completed_at,
        lastScore: progress.last_score,
      },
    ]),
  );

  const [{ data: spaces }, { data: materials }] = await Promise.all([
    spaceIds.length > 0
      ? context.supabase.from("study_spaces").select("id,name").in("id", spaceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    materialIds.length > 0
      ? context.supabase.from("materials").select("id,name").in("id", materialIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const spaceNames = new Map((spaces ?? []).map((space) => [space.id, space.name]));
  const materialNames = new Map((materials ?? []).map((material) => [material.id, material.name]));

  const memeConfig = (artifacts ?? []).some((artifact) => artifact.kind === "meme")
    ? await loadMemeTemplates().catch(() => null)
    : null;

  const items = await Promise.all(
    (artifacts ?? []).map(async (artifact) => {
      const kind = artifact.kind as LearningFeedKind;
      let payload;
      try {
        payload = redactLearningPayload(kind, artifact.payload);
      } catch {
        return null;
      }

      const meme =
        kind === "meme"
          ? await buildMemeLayout({
              payload: artifact.payload,
              origin: resolvePublicOrigin(request, request.nextUrl.origin),
              config: memeConfig,
            })
          : null;

      let assetUrl: string | null = null;
      if (artifact.asset_path) {
        const { data } = await context.supabase.storage
          .from("learning-assets")
          .createSignedUrl(artifact.asset_path, 3600);
        assetUrl = data?.signedUrl ?? null;
      }

      return {
        id: artifact.id,
        kind,
        title: artifact.title,
        payload,
        assetUrl,
        meme,
        studySpaceId: artifact.study_space_id,
        studySpaceName: spaceNames.get(artifact.study_space_id) ?? "Study space",
        materialId: artifact.material_id,
        materialName: artifact.material_id
          ? materialNames.get(artifact.material_id) ?? "Study material"
          : null,
        createdAt: artifact.created_at,
        progress: (() => {
          const progress = progressMap.get(artifact.id) ?? {
            completedAt: null,
            lastScore: null,
          };
          const attempt = latestAttempts.get(artifact.id);

          if (!progress.completedAt) return progress;

          if (kind === "quiz") {
            const quizPayload =
              artifact.payload &&
              typeof artifact.payload === "object" &&
              !Array.isArray(artifact.payload)
                ? (artifact.payload as { correct_index?: unknown })
                : {};
            return {
              ...progress,
              quizSelectedIndex:
                typeof attempt?.answer === "number" && Number.isInteger(attempt.answer)
                  ? attempt.answer
                  : null,
              quizCorrectIndex:
                typeof quizPayload.correct_index === "number" &&
                Number.isInteger(quizPayload.correct_index)
                  ? quizPayload.correct_index
                  : null,
            };
          }

          if (kind === "true_false") {
            return {
              ...progress,
              trueFalseSelected: typeof attempt?.answer === "boolean" ? attempt.answer : null,
            };
          }

          if (kind === "fill_blank") {
            return {
              ...progress,
              fillBlankSelectedAnswer:
                typeof attempt?.answer === "string" ? attempt.answer : null,
            };
          }

          return progress;
        })(),
      };
    }),
  );

  const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);
  const sortedItems = sortLearningFeedItems(validItems);
  const rawArtifacts = artifacts ?? [];
  const nextCursor =
    rawArtifacts.length === limit
      ? rawArtifacts[rawArtifacts.length - 1]?.created_at ?? null
      : null;

  return NextResponse.json({ items: sortedItems, nextCursor });
}
