import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonValue } from "@/lib/study-tools";
import {
  learningArtifactTitle,
  learningFeedKinds,
  parseLearningPayload,
} from "@/lib/learning-feed";
import { generateLearningPack } from "@/lib/meme-generator";
import { getAuthContext } from "@/lib/supabase/server";
import type { LearningFeedKind } from "@/lib/supabase/database";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  studySpaceId: z.string().uuid(),
  materialId: z.string().uuid(),
  maxAtoms: z.number().int().min(1).max(25).default(5),
  quizCount: z.number().int().min(0).max(10).default(3),
  skipExisting: z.boolean().default(true),
  types: z
    .array(z.enum(learningFeedKinds))
    .min(1)
    .default([...learningFeedKinds]),
});

type GenerationFailure = {
  itemKey: string;
  kind: LearningFeedKind;
  detail: string;
};

function safeAssetKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "asset";
}

export async function POST(request: Request) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid generation request." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data: material, error: materialError } = await context.supabase
    .from("materials")
    .select("id,name,status,study_space_id")
    .eq("id", input.materialId)
    .eq("study_space_id", input.studySpaceId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (materialError) {
    return NextResponse.json({ error: materialError.message }, { status: 500 });
  }
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }
  if (material.status !== "ready") {
    return NextResponse.json(
      { error: "Index this material before generating learning content." },
      { status: 400 },
    );
  }

  const { data: chunks, error: chunksError } = await context.supabase
    .from("material_chunks")
    .select("content,chunk_index")
    .eq("material_id", material.id)
    .eq("user_id", context.user.id)
    .eq("study_space_id", input.studySpaceId)
    .order("chunk_index", { ascending: true })
    .limit(200);

  if (chunksError) {
    return NextResponse.json({ error: chunksError.message }, { status: 500 });
  }

  const sourceText = (chunks ?? [])
    .map((chunk) => chunk.content.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 100000);

  if (!sourceText) {
    return NextResponse.json(
      { error: "This material has no indexed text to learn from." },
      { status: 400 },
    );
  }

  let learningPack: Awaited<ReturnType<typeof generateLearningPack>>;
  try {
    learningPack = await generateLearningPack({
      sourceText,
      maxAtoms: input.maxAtoms,
      quizCount: input.quizCount,
      types: input.types,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not generate the learning pack.",
      },
      { status: 502 },
    );
  }

  const generationFailures: GenerationFailure[] = learningPack.failures.map((failure) => ({
    itemKey: failure.item_key,
    kind: failure.kind,
    detail: failure.detail,
  }));

  const atomRows = learningPack.atoms.map((atom) => ({
    user_id: context.user!.id,
    study_space_id: input.studySpaceId,
    material_id: material.id,
    concept: atom.concept,
    tension: jsonValue(atom.tension),
    emotional_shape: atom.emotional_shape,
  }));

  if (atomRows.length > 0) {
    const { error: atomsError } = await context.supabase
      .from("learning_atoms")
      .upsert(atomRows, { onConflict: "user_id,material_id,concept" });

    if (atomsError) {
      return NextResponse.json({ error: atomsError.message }, { status: 500 });
    }
  }

  const { data: savedAtoms, error: savedAtomsError } = await context.supabase
    .from("learning_atoms")
    .select("id,concept")
    .eq("user_id", context.user.id)
    .eq("material_id", material.id);

  if (savedAtomsError) {
    return NextResponse.json({ error: savedAtomsError.message }, { status: 500 });
  }

  const atomByConcept = new Map((savedAtoms ?? []).map((atom) => [atom.concept, atom.id]));
  const generationKeys = learningPack.items.map(
    (item) => material.id + ":" + item.item_key,
  );
  const { data: existingArtifacts, error: existingError } =
    generationKeys.length > 0
      ? await context.supabase
          .from("study_artifacts")
          .select("generation_key")
          .eq("user_id", context.user.id)
          .eq("material_id", material.id)
          .in("generation_key", generationKeys)
      : { data: [], error: null };

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingKeys = new Set(
    (existingArtifacts ?? [])
      .map((artifact) => artifact.generation_key)
      .filter((key): key is string => Boolean(key)),
  );
  let created = 0;
  let skipped = 0;

  for (const item of learningPack.items) {
    const generationKey = material.id + ":" + item.item_key;
    if (input.skipExisting && existingKeys.has(generationKey)) {
      skipped += 1;
      continue;
    }

    let parsedPayload;
    try {
      parsedPayload = parseLearningPayload(item.kind, item.payload);
    } catch (error) {
      generationFailures.push({
        itemKey: item.item_key,
        kind: item.kind,
        detail: error instanceof Error ? error.message : "Invalid generated payload.",
      });
      continue;
    }

    let assetPath: string | null = null;
    if (item.asset) {
      assetPath =
        context.user.id +
        "/" +
        material.id +
        "/" +
        safeAssetKey(item.item_key) +
        "-" +
        crypto.randomUUID() +
        "." + (item.asset.mime_type === "image/svg+xml" ? "svg" : "jpg");
      const { error: uploadError } = await context.supabase.storage
        .from("learning-assets")
        .upload(assetPath, Buffer.from(item.asset.base64, "base64"), {
          contentType: item.asset.mime_type,
          upsert: false,
        });
      if (uploadError) {
        generationFailures.push({
          itemKey: item.item_key,
          kind: item.kind,
          detail: uploadError.message,
        });
        continue;
      }
    }

    const atomId =
      item.atom_index === null
        ? null
        : atomByConcept.get(learningPack.atoms[item.atom_index]?.concept) ?? null;
    const { error: insertError } = await context.supabase
      .from("study_artifacts")
      .insert({
        user_id: context.user.id,
        study_space_id: input.studySpaceId,
        atom_id: atomId,
        material_id: material.id,
        asset_path: assetPath,
        generation_key: generationKey,
        kind: item.kind,
        title: learningArtifactTitle(item.kind),
        payload: jsonValue(parsedPayload),
      });

    if (insertError) {
      if (assetPath) {
        await context.supabase.storage.from("learning-assets").remove([assetPath]);
      }
      generationFailures.push({
        itemKey: item.item_key,
        kind: item.kind,
        detail: insertError.message,
      });
      continue;
    }
    created += 1;
  }

  return NextResponse.json({
    materialId: material.id,
    atomCount: learningPack.atoms.length,
    created,
    skipped,
    failures: generationFailures,
  });
}
