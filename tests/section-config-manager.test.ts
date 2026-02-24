import { describe, it, expect, vi, beforeEach } from "vitest";
import { SectionConfigManager } from "../src/managers/section-config-manager";

function makeLovelace(sections: any[] = []) {
  return {
    config: {
      views: [{
        type: "custom:sections-grid-layout",
        sections,
      }],
    },
    saveConfig: vi.fn().mockResolvedValue(undefined),
  };
}

describe("SectionConfigManager", () => {
  let manager: SectionConfigManager;

  beforeEach(() => {
    manager = new SectionConfigManager();
  });

  // ── handleSectionConfigChanged ─────────────────────────────────────────

  describe("handleSectionConfigChanged", () => {
    it("updates existing section in config array", () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "main", cards: [], title: "Old" },
      ]);
      manager.handleSectionConfigChanged("main", { title: "New" }, lovelace, 0);
      expect(lovelace.saveConfig).toHaveBeenCalledTimes(1);
      const savedConfig = lovelace.saveConfig.mock.calls[0][0];
      const savedSections = savedConfig.views[0].sections;
      expect(savedSections.length).toBe(1);
      expect(savedSections[0].title).toBe("New");
      expect(savedSections[0].grid_area).toBe("main");
    });

    it("appends new section when grid_area not found", () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "main", cards: [] },
      ]);
      manager.handleSectionConfigChanged("sidebar", { title: "Sidebar" }, lovelace, 0);
      const savedSections = lovelace.saveConfig.mock.calls[0][0].views[0].sections;
      expect(savedSections.length).toBe(2);
      expect(savedSections[1].grid_area).toBe("sidebar");
    });

    it("does nothing when lovelace is null", () => {
      expect(() => {
        manager.handleSectionConfigChanged("main", { title: "New" }, null, 0);
      }).not.toThrow();
    });

    it("preserves grid_area in updated config", () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "main", cards: [] },
      ]);
      manager.handleSectionConfigChanged("main", { title: "Updated" }, lovelace, 0);
      const saved = lovelace.saveConfig.mock.calls[0][0].views[0].sections[0];
      expect(saved.grid_area).toBe("main");
    });
  });

  // ── handleDeleteSection ────────────────────────────────────────────────

  describe("handleDeleteSection", () => {
    it("removes section with matching grid_area", () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "main", cards: [] },
        { type: "grid", grid_area: "sidebar", cards: [] },
      ]);
      manager.handleDeleteSection("main", lovelace, 0);
      const savedSections = lovelace.saveConfig.mock.calls[0][0].views[0].sections;
      expect(savedSections.length).toBe(1);
      expect(savedSections[0].grid_area).toBe("sidebar");
    });

    it("preserves other sections", () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "a", cards: [] },
        { type: "grid", grid_area: "b", cards: [] },
        { type: "grid", grid_area: "c", cards: [] },
      ]);
      manager.handleDeleteSection("b", lovelace, 0);
      const savedSections = lovelace.saveConfig.mock.calls[0][0].views[0].sections;
      expect(savedSections.map((s: any) => s.grid_area)).toEqual(["a", "c"]);
    });

    it("does nothing when lovelace is null", () => {
      expect(() => {
        manager.handleDeleteSection("main", null, 0);
      }).not.toThrow();
    });
  });

  // ── ensureAllSectionsExistInConfig ─────────────────────────────────────

  describe("ensureAllSectionsExistInConfig", () => {
    it("creates sections for missing grid areas", async () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "main", cards: [] },
      ]);
      const onComplete = vi.fn();
      await manager.ensureAllSectionsExistInConfig(
        "'main sidebar'\n'main footer'", lovelace, 0, onComplete
      );
      const savedSections = lovelace.saveConfig.mock.calls[0][0].views[0].sections;
      const areas = savedSections.map((s: any) => s.grid_area);
      expect(areas).toContain("main");
      expect(areas).toContain("sidebar");
      expect(areas).toContain("footer");
    });

    it("does not duplicate existing sections", async () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "main", cards: [] },
        { type: "grid", grid_area: "sidebar", cards: [] },
      ]);
      const onComplete = vi.fn();
      await manager.ensureAllSectionsExistInConfig(
        "'main sidebar'", lovelace, 0, onComplete
      );
      // All areas already exist, so no save should happen
      expect(lovelace.saveConfig).not.toHaveBeenCalled();
    });

    it("calls onComplete when no areas defined", async () => {
      const lovelace = makeLovelace([]);
      const onComplete = vi.fn();
      await manager.ensureAllSectionsExistInConfig(undefined, lovelace, 0, onComplete);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(lovelace.saveConfig).not.toHaveBeenCalled();
    });

    it("calls onComplete when all areas exist", async () => {
      const lovelace = makeLovelace([
        { type: "grid", grid_area: "main", cards: [] },
      ]);
      const onComplete = vi.fn();
      await manager.ensureAllSectionsExistInConfig("'main'", lovelace, 0, onComplete);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("calls onComplete when lovelace is null", async () => {
      const onComplete = vi.fn();
      await manager.ensureAllSectionsExistInConfig("'main sidebar'", null, 0, onComplete);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("auto-creates sections with formatted titles", async () => {
      const lovelace = makeLovelace([]);
      const onComplete = vi.fn();
      await manager.ensureAllSectionsExistInConfig(
        "'footer-left footer-right'", lovelace, 0, onComplete
      );
      const savedSections = lovelace.saveConfig.mock.calls[0][0].views[0].sections;
      const titles = savedSections.map((s: any) => s.title);
      expect(titles).toContain("Footer Left");
      expect(titles).toContain("Footer Right");
    });

    it("auto-creates sections with type grid and empty cards", async () => {
      const lovelace = makeLovelace([]);
      const onComplete = vi.fn();
      await manager.ensureAllSectionsExistInConfig("'main'", lovelace, 0, onComplete);
      const section = lovelace.saveConfig.mock.calls[0][0].views[0].sections[0];
      expect(section.type).toBe("grid");
      expect(section.cards).toEqual([]);
    });
  });

  // ── isSaving ───────────────────────────────────────────────────────────

  describe("isSaving", () => {
    it("is false initially", () => {
      expect(manager.isSaving).toBe(false);
    });
  });

  // ── save error handling ────────────────────────────────────────────────

  describe("save error handling", () => {
    it("handles save failure gracefully", async () => {
      const lovelace = makeLovelace([]);
      lovelace.saveConfig.mockRejectedValue(new Error("save failed"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Should not throw
      manager.handleSectionConfigChanged("main", { title: "Test" }, lovelace, 0);
      // Wait for async save to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        "sections-grid-layout: failed to save section config",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
