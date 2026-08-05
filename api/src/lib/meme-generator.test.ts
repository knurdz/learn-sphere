import { describe, expect, it } from "vitest";
import {
  fallbackCaptions,
  matchMemeTemplate,
  memeTemplateCandidates,
  renderMemeSvg,
  validateMemeCaptions,
  type MemeTemplateConfig,
} from "@/lib/meme-generator";

const config: MemeTemplateConfig = {
  drake: {
    file: "drake.jpg",
    description: "A preference contrast.",
    shapes: ["preference"],
    slots: [
      { name: "reject", box: [650, 170, 1100, 520], max_font: 60 },
      { name: "prefer", box: [650, 760, 1100, 1045], max_font: 60 },
    ],
  },
};

const multiConfig: MemeTemplateConfig = {
  ...config,
  disaster_girl: {
    file: "disaster_girl.jpg",
    description: "Someone caused the chaos behind them.",
    shapes: ["betrayal", "irony"],
    slots: [
      { name: "the_disaster", box: [26, 1, 352, 109] },
      { name: "the_instigator", box: [20, 285, 285, 367] },
    ],
  },
  handsome_squidward: {
    file: "handsome_squidward.jpg",
    description: "Ideal versus stressed version.",
    shapes: ["irony"],
    slots: [
      { name: "idealized_subject", box: [57, 18, 420, 86] },
      { name: "stressed_subject", box: [69, 391, 420, 465] },
    ],
  },
};

const atom = {
  concept: "Photosynthesis",
  tension: {
    setup: "Plants look passive",
    twist: "They run a chemical factory",
    emotional_shape: "irony" as const,
  },
  emotional_shape: "irony" as const,
};

describe("meme generation contracts", () => {
  it("matches a template by emotional shape and falls back to drake", () => {
    expect(matchMemeTemplate(config, "preference")?.[0]).toBe("drake");
    expect(matchMemeTemplate(config, "irony")?.[0]).toBe("drake");
  });

  it("renders a private-storage-ready SVG from a bundled template", async () => {
    const svg = await renderMemeSvg({
      templateId: "drake",
      captions: { reject: "Memorizing every detail", prefer: "Learning the key idea" },
      config,
    });

    expect(svg.toString("utf8")).toContain("<svg");
    expect(svg.toString("utf8")).toContain("data:image/jpeg;base64,");
    expect(svg.toString("utf8")).toContain("Learning the");
    expect(svg.toString("utf8")).toContain("key idea");
  });

  it("prefers unused templates that match the emotional shape", () => {
    const fresh = memeTemplateCandidates({
      config: multiConfig,
      emotionalShape: "irony",
      usedTemplateIds: [],
    });
    expect(fresh[0][0]).toBe("disaster_girl");

    const afterUse = memeTemplateCandidates({
      config: multiConfig,
      emotionalShape: "irony",
      usedTemplateIds: ["disaster_girl"],
    });
    expect(afterUse[0][0]).toBe("handsome_squidward");
    expect(afterUse.map((entry) => entry[0])).toContain("disaster_girl");
  });

  it("rejects captions that are missing or repeated across slots", () => {
    expect(
      validateMemeCaptions({
        template: config.drake,
        captions: { reject: "Cramming facts", prefer: "Understanding ideas" },
      }),
    ).toBeNull();

    expect(
      validateMemeCaptions({
        template: config.drake,
        captions: { reject: "Same idea", prefer: "same idea!" },
      }),
    ).toMatch(/different caption/i);

    expect(
      validateMemeCaptions({
        template: config.drake,
        captions: { reject: "Only one" },
      }),
    ).toMatch(/prefer/);
  });

  it("builds distinct fallback captions for every slot", () => {
    const captions = fallbackCaptions(config.drake, atom);
    expect(Object.keys(captions)).toEqual(["reject", "prefer"]);
    expect(validateMemeCaptions({ template: config.drake, captions })).toBeNull();
  });
});
