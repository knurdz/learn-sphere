import { describe, expect, it } from "vitest";
import {
  emotionalShapes,
  loadMemeTemplates,
  memeTemplateDimensions,
} from "@/lib/meme-generator";

describe("meme template config", () => {
  it("keeps every caption box inside its image", async () => {
    const config = await loadMemeTemplates();
    expect(Object.keys(config).length).toBeGreaterThanOrEqual(20);

    for (const [id, template] of Object.entries(config)) {
      const { width, height } = await memeTemplateDimensions(template.file);
      expect(template.description.length, `${id} description`).toBeGreaterThan(20);
      expect(template.shapes.length, `${id} shapes`).toBeGreaterThan(0);
      for (const shape of template.shapes) {
        expect(emotionalShapes, `${id} shape ${shape}`).toContain(shape);
      }

      const names = template.slots.map((slot) => slot.name);
      expect(new Set(names).size, `${id} slot names`).toBe(names.length);
      expect(names.length, `${id} slot count`).toBeGreaterThan(0);

      for (const slot of template.slots) {
        const [left, top, right, bottom] = slot.box;
        expect(left, `${id}.${slot.name} left`).toBeGreaterThanOrEqual(0);
        expect(top, `${id}.${slot.name} top`).toBeGreaterThanOrEqual(0);
        expect(right, `${id}.${slot.name} right`).toBeLessThanOrEqual(width);
        expect(bottom, `${id}.${slot.name} bottom`).toBeLessThanOrEqual(height);
        expect(right - left, `${id}.${slot.name} width`).toBeGreaterThan(40);
        expect(bottom - top, `${id}.${slot.name} height`).toBeGreaterThan(20);
        expect(slot.max_font ?? template.max_font ?? 0, `${id}.${slot.name} font`).toBeGreaterThan(0);
      }
    }
  });

  it("offers several templates for every emotional shape", async () => {
    const config = await loadMemeTemplates();
    for (const shape of emotionalShapes) {
      const matching = Object.values(config).filter((template) => template.shapes.includes(shape));
      expect(matching.length, `templates for ${shape}`).toBeGreaterThanOrEqual(3);
    }
  });
});
