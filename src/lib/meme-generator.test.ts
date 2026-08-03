import { describe, expect, it } from "vitest";
import {
  matchMemeTemplate,
  renderMemeSvg,
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
});
