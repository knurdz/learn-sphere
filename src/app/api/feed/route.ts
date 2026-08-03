import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  learningFeedKinds,
  redactLearningPayload,
  sortLearningFeedItems,
} from "@/lib/learning-feed";
import { getAuthContext } from "@/lib/supabase/server";
import type { LearningFeedKind } from "@/lib/supabase/database";

const uuidSchema = z.string().uuid();

export async function GET(request: NextRequest) {
  const context = await getAuthContext();

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const spaceParam = params.get("studySpaceId");
  const kindParam = params.get("kind");
  const limit = Math.min(Math.max(Number(params.get("limit") || 50), 1), 80);

  if (spaceParam && !uuidSchema.safeParse(spaceParam).success) {
    return NextResponse.json({ error: "Invalid study space." }, { status: 400 });
  }
  if (kindParam && !learningFeedKinds.includes(kindParam as LearningFeedKind)) {
    return NextResponse.json({ error: "Invalid feed category." }, { status: 400 });
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

  const items = await Promise.all(
    (artifacts ?? []).map(async (artifact) => {
      const kind = artifact.kind as LearningFeedKind;
      let payload;
      try {
        payload = redactLearningPayload(kind, artifact.payload);
      } catch {
        return null;
      }

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
        studySpaceId: artifact.study_space_id,
        studySpaceName: spaceNames.get(artifact.study_space_id) ?? "Study space",
        materialId: artifact.material_id,
        materialName: artifact.material_id
          ? materialNames.get(artifact.material_id) ?? "Study material"
          : null,
        createdAt: artifact.created_at,
        progress: progressMap.get(artifact.id) ?? {
          completedAt: null,
          lastScore: null,
        },
      };
    }),
  );

  const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);

  return NextResponse.json({ items: sortLearningFeedItems(validItems) });
}
