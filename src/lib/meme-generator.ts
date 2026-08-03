import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  learningFeedKinds,
  parseLearningPayload,
  type LearningPayload,
} from "@/lib/learning-feed";
import { generateGroqText } from "@/lib/providers/groq";
import type { LearningFeedKind } from "@/lib/supabase/database";

type EmotionalShape =
  | "dilemma"
  | "preference"
  | "betrayal"
  | "irony"
  | "escalation";

type MemeTemplateSlot = {
  name: string;
  box: [number, number, number, number];
  max_font?: number;
};

export type MemeTemplate = {
  file: string;
  description: string;
  shapes: EmotionalShape[];
  text_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  max_font?: number;
  slots: MemeTemplateSlot[];
};

export type MemeTemplateConfig = Record<string, MemeTemplate>;

export type GeneratedLearningAtom = {
  concept: string;
  tension: {
    setup: string;
    twist: string;
    emotional_shape: EmotionalShape;
  };
  emotional_shape: EmotionalShape;
};

export type GeneratedLearningItem = {
  item_key: string;
  kind: LearningFeedKind;
  atom_index: number | null;
  payload: LearningPayload;
  asset: {
    base64: string;
    mime_type: string;
  } | null;
};

export type GenerationFailure = {
  item_key: string;
  kind: LearningFeedKind;
  atom_index: number | null;
  detail: string;
};

const shapeSchema = z.enum([
  "dilemma",
  "preference",
  "betrayal",
  "irony",
  "escalation",
]);

const atomSchema = z.object({
  concept: z.string().trim().min(1).max(240),
  tension: z.object({
    setup: z.string().trim().min(1).max(500),
    twist: z.string().trim().min(1).max(500),
    emotional_shape: shapeSchema,
  }),
  emotional_shape: shapeSchema.optional(),
});

const atomsResponseSchema = z.object({
  atoms: z.array(atomSchema).min(1).max(25),
});

const captionsResponseSchema = z.object({
  captions: z.record(z.string(), z.string().trim().min(1).max(180)),
});

const quizResponseSchema = z.object({
  question: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(180)).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(500),
});

const trueFalseResponseSchema = z.object({
  statement: z.string().trim().min(1).max(500),
  is_true: z.boolean(),
  explanation: z.string().trim().min(1).max(500),
});

const fillBlankResponseSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(180),
  explanation: z.string().trim().min(1).max(500),
});

function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The model returned invalid JSON.");
  }
}

async function generateJson<T>(input: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}) {
  const response = await generateGroqText({
    system: input.system,
    messages: [{ role: "user", content: input.prompt }],
    maxTokens: input.maxTokens,
  });
  return input.schema.parse(parseJson(response));
}

export async function loadMemeTemplates(): Promise<MemeTemplateConfig> {
  const configPath = path.join(process.cwd(), "public", "meme-templates", "config.json");
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw) as MemeTemplateConfig;
}

export function matchMemeTemplate(
  config: MemeTemplateConfig,
  emotionalShape: EmotionalShape,
) {
  return (
    Object.entries(config).find(([, template]) =>
      template.shapes.includes(emotionalShape),
    ) ?? Object.entries(config).find(([id]) => id === "drake") ?? Object.entries(config)[0]
  );
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapCaption(value: string, maxCharacters: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (line && candidate.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [" "];
}

function jpegDimensions(buffer: Buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xc3 &&
      marker !== 0xc1;
    if (isStartOfFrame) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += 2 + length;
  }
  return { width: 1200, height: 1200 };
}

export async function renderMemeSvg(input: {
  templateId: string;
  captions: Record<string, string>;
  config: MemeTemplateConfig;
}) {
  const template = input.config[input.templateId];
  if (!template) throw new Error("Meme template not found.");

  const imagePath = path.join(
    process.cwd(),
    "public",
    "meme-templates",
    template.file,
  );
  const image = await readFile(imagePath);
  const { width, height } = jpegDimensions(image);
  const imageData = image.toString("base64");
  const textColor = template.text_color || "white";
  const strokeColor = template.stroke_color || "black";
  const strokeWidth = template.stroke_width ?? 3;

  const texts = template.slots
    .map((slot) => {
      const [left, top, right, bottom] = slot.box;
      const boxWidth = right - left;
      const boxHeight = bottom - top;
      const fontSize = slot.max_font || template.max_font || 36;
      const maxCharacters = Math.max(8, Math.floor(boxWidth / Math.max(fontSize * 0.58, 1)));
      const lines = wrapCaption(input.captions[slot.name] || "", maxCharacters);
      const lineHeight = fontSize * 1.08;
      const totalHeight = lines.length * lineHeight;
      const firstBaseline = top + (boxHeight - totalHeight) / 2 + fontSize;
      const tspans = lines
        .map(
          (line, index) =>
            `<tspan x="${(left + right) / 2}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
        )
        .join("");

      return `<text x="${(left + right) / 2}" y="${firstBaseline}" text-anchor="middle" dominant-baseline="alphabetic" font-family="Impact, Anton, Arial Black, sans-serif" font-size="${fontSize}" font-weight="900" fill="${escapeXml(textColor)}" stroke="${escapeXml(strokeColor)}" stroke-width="${strokeWidth}" paint-order="stroke fill">${tspans}</text>`;
    })
    .join("");

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="data:image/jpeg;base64,${imageData}" width="${width}" height="${height}" preserveAspectRatio="none"/>${texts}</svg>`,
  );
}

function contextFor(sourceText: string, atom: GeneratedLearningAtom) {
  return [
    "Source material:",
    sourceText.slice(0, 60000),
    "",
    `Concept: ${atom.concept}`,
    `Setup: ${atom.tension.setup}`,
    `Twist: ${atom.tension.twist}`,
  ].join("\n");
}

function fallbackCaption(slot: MemeTemplateSlot, atom: GeneratedLearningAtom) {
  const values = [
    atom.concept,
    atom.tension.setup,
    atom.tension.twist,
    `${atom.concept}: ${atom.tension.twist}`,
  ];
  return values[slot.name.length % values.length];
}

async function createMeme(
  sourceText: string,
  atom: GeneratedLearningAtom,
  atomIndex: number,
  config: MemeTemplateConfig,
) {
  const matched = matchMemeTemplate(config, atom.emotional_shape);
  if (!matched) throw new Error("No meme templates are configured.");
  const [templateId, template] = matched;
  const generated = await generateJson({
    system:
      "You write concise educational meme captions. Return only JSON. Captions must be accurate to the source material, concrete, and short enough to fit the named meme slots.",
    prompt: `${contextFor(sourceText, atom)}\n\nMeme template: ${template.description}\nNamed slots: ${template.slots.map((slot) => slot.name).join(", ")}\nReturn {"captions":{"slot_name":"caption"}} with one caption for every slot.`,
    schema: captionsResponseSchema,
    maxTokens: 900,
  });
  const captions = Object.fromEntries(
    template.slots.map((slot) => [
      slot.name,
      generated.captions[slot.name] || fallbackCaption(slot, atom),
    ]),
  );
  const image = await renderMemeSvg({ templateId, captions, config });
  const payload = parseLearningPayload("meme", {
    template_id: templateId,
    captions,
  });
  return {
    item_key: `meme-${atomIndex}-${templateId}`,
    kind: "meme" as const,
    atom_index: atomIndex,
    payload,
    asset: { base64: image.toString("base64"), mime_type: "image/svg+xml" },
  } satisfies GeneratedLearningItem;
}

function createFlashcard(atom: GeneratedLearningAtom, atomIndex: number) {
  return {
    item_key: `flashcard-${atomIndex}`,
    kind: "flashcard" as const,
    atom_index: atomIndex,
    payload: parseLearningPayload("flashcard", {
      front: atom.concept,
      back: `${atom.tension.setup} ${atom.tension.twist}`,
    }),
    asset: null,
  } satisfies GeneratedLearningItem;
}

function createDidYouKnow(atom: GeneratedLearningAtom, atomIndex: number) {
  return {
    item_key: `did-you-know-${atomIndex}`,
    kind: "did_you_know" as const,
    atom_index: atomIndex,
    payload: parseLearningPayload("did_you_know", {
      headline: `Did you know about ${atom.concept}?`,
      fact: atom.tension.twist,
      concept: atom.concept,
    }),
    asset: null,
  } satisfies GeneratedLearningItem;
}

export async function generateLearningPack(input: {
  sourceText: string;
  maxAtoms: number;
  quizCount: number;
  types: readonly LearningFeedKind[];
}) {
  const failures: GenerationFailure[] = [];
  let atoms: GeneratedLearningAtom[] = [];

  try {
    const generated = await generateJson({
      system:
        "You extract memorable learning atoms from study material. Return only JSON. Each atom must identify one accurate concept and a setup/twist tension that makes the concept memorable without inventing facts.",
      prompt: `Extract up to ${input.maxAtoms} distinct learning atoms from this source. Use only these emotional shapes: dilemma, preference, betrayal, irony, escalation. Return {"atoms":[{"concept":"...","tension":{"setup":"...","twist":"...","emotional_shape":"irony"}}]}.\n\n${input.sourceText.slice(0, 100000)}`,
      schema: atomsResponseSchema,
      maxTokens: Math.min(3500, 700 + input.maxAtoms * 500),
    });
    atoms = generated.atoms.map((atom) => ({
      ...atom,
      emotional_shape: atom.emotional_shape || atom.tension.emotional_shape,
      tension: {
        ...atom.tension,
        emotional_shape: atom.tension.emotional_shape,
      },
    }));
  } catch (error) {
    failures.push({
      item_key: "atom-extraction",
      kind: input.types[0] || learningFeedKinds[0],
      atom_index: null,
      detail: error instanceof Error ? error.message : "Could not extract learning atoms.",
    });
    return { atoms, items: [] as GeneratedLearningItem[], failures };
  }

  const config = input.types.includes("meme") ? await loadMemeTemplates() : null;
  const items: GeneratedLearningItem[] = [];
  let quizCreated = 0;

  for (const [atomIndex, atom] of atoms.entries()) {
    if (input.types.includes("meme") && config) {
      try {
        items.push(await createMeme(input.sourceText, atom, atomIndex, config));
      } catch (error) {
        failures.push({
          item_key: `meme-${atomIndex}`,
          kind: "meme",
          atom_index: atomIndex,
          detail: error instanceof Error ? error.message : "Could not create meme.",
        });
      }
    }

    if (input.types.includes("flashcard")) items.push(createFlashcard(atom, atomIndex));
    if (input.types.includes("did_you_know")) items.push(createDidYouKnow(atom, atomIndex));

    if (input.types.includes("fill_blank")) {
      try {
        const generated = await generateJson({
          system: "Create one accurate fill-in-the-blank study question. Return only JSON.",
          prompt: `${contextFor(input.sourceText, atom)}\n\nReturn {"prompt":"... use ____ for the missing answer","answer":"...","explanation":"..."}.`,
          schema: fillBlankResponseSchema,
          maxTokens: 700,
        });
        items.push({
          item_key: `fill-blank-${atomIndex}`,
          kind: "fill_blank",
          atom_index: atomIndex,
          payload: parseLearningPayload("fill_blank", generated),
          asset: null,
        });
      } catch (error) {
        failures.push({
          item_key: `fill-blank-${atomIndex}`,
          kind: "fill_blank",
          atom_index: atomIndex,
          detail: error instanceof Error ? error.message : "Could not create fill-in-the-blank question.",
        });
      }
    }

    if (input.types.includes("true_false")) {
      try {
        const generated = await generateJson({
          system: "Create one accurate true/false study question. Return only JSON.",
          prompt: `${contextFor(input.sourceText, atom)}\n\nReturn {"statement":"...","is_true":true,"explanation":"..."}.`,
          schema: trueFalseResponseSchema,
          maxTokens: 700,
        });
        items.push({
          item_key: `true-false-${atomIndex}`,
          kind: "true_false",
          atom_index: atomIndex,
          payload: parseLearningPayload("true_false", generated),
          asset: null,
        });
      } catch (error) {
        failures.push({
          item_key: `true-false-${atomIndex}`,
          kind: "true_false",
          atom_index: atomIndex,
          detail: error instanceof Error ? error.message : "Could not create true/false question.",
        });
      }
    }

    if (input.types.includes("quiz") && quizCreated < input.quizCount) {
      try {
        const generated = await generateJson({
          system: "Create one accurate four-option multiple-choice study question. Return only JSON.",
          prompt: `${contextFor(input.sourceText, atom)}\n\nReturn {"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"..."}.`,
          schema: quizResponseSchema,
          maxTokens: 900,
        });
        items.push({
          item_key: `quiz-${atomIndex}`,
          kind: "quiz",
          atom_index: atomIndex,
          payload: parseLearningPayload("quiz", generated),
          asset: null,
        });
        quizCreated += 1;
      } catch (error) {
        failures.push({
          item_key: `quiz-${atomIndex}`,
          kind: "quiz",
          atom_index: atomIndex,
          detail: error instanceof Error ? error.message : "Could not create quiz question.",
        });
      }
    }
  }

  return { atoms, items, failures };
}
