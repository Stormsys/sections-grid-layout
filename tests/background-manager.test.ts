// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BackgroundManager } from "../src/managers/background-manager";

function makeHost(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function makeHass(states: Record<string, { state: string; attributes?: Record<string, any> }> = {}) {
  return { states };
}

describe("BackgroundManager", () => {
  let host: HTMLElement;
  let manager: BackgroundManager;

  beforeEach(() => {
    host = makeHost();
    manager = new BackgroundManager(host);
  });

  afterEach(() => {
    manager.destroy();
    host.remove();
    // Clean up any leftover bg elements
    document.querySelectorAll("[id^='sgl-bg-']").forEach(el => el.remove());
  });

  // ── setup ──────────────────────────────────────────────────────────────

  describe("setup", () => {
    it("does nothing when no background_image in config", () => {
      manager.setup({}, makeHass());
      expect(document.querySelectorAll("[id^='sgl-bg-']").length).toBe(0);
    });

    it("creates background div for static URL", () => {
      manager.setup({ background_image: "https://example.com/bg.jpg" }, makeHass());
      const bgEls = document.querySelectorAll("[id^='sgl-bg-']");
      expect(bgEls.length).toBe(1);
      expect((bgEls[0] as HTMLElement).style.backgroundImage).toContain("example.com/bg.jpg");
    });

    it("applies blur and opacity from config", () => {
      manager.setup({
        background_image: "https://example.com/bg.jpg",
        background_blur: "10px",
        background_opacity: 0.5,
      }, makeHass());
      const bgEl = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl.style.filter).toBe("blur(10px)");
      expect(bgEl.style.opacity).toBe("0.5");
    });

    it("uses default blur and opacity when not specified", () => {
      manager.setup({ background_image: "https://example.com/bg.jpg" }, makeHass());
      const bgEl = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl.style.filter).toBe("blur(0px)");
      expect(bgEl.style.opacity).toBe("1");
    });

    it("calls evaluateTemplate for template URLs", () => {
      const hass = makeHass({ "camera.front": { state: "https://cam.jpg" } });
      manager.setup({ background_image: "{{ states('camera.front') }}" }, hass);
      const bgEl = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl.style.backgroundImage).toContain("cam.jpg");
    });
  });

  // ── evaluateTemplate ───────────────────────────────────────────────────

  describe("evaluateTemplate", () => {
    it("resolves states() template to entity state value", () => {
      const hass = makeHass({ "sensor.url": { state: "https://img.jpg" } });
      manager.evaluateTemplate({ background_image: "{{ states('sensor.url') }}" }, hass);
      const bgEl = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl.style.backgroundImage).toContain("img.jpg");
    });

    it("resolves state_attr() template to attribute value", () => {
      const hass = makeHass({
        "media_player.tv": { state: "playing", attributes: { entity_picture: "https://art.jpg" } },
      });
      manager.evaluateTemplate({
        background_image: "{{ state_attr('media_player.tv', 'entity_picture') }}"
      }, hass);
      const bgEl = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl.style.backgroundImage).toContain("art.jpg");
    });

    it("skips unknown state values", () => {
      const hass = makeHass({ "sensor.url": { state: "unknown" } });
      manager.evaluateTemplate({ background_image: "{{ states('sensor.url') }}" }, hass);
      expect(document.querySelectorAll("[id^='sgl-bg-']").length).toBe(0);
    });

    it("skips unavailable state values", () => {
      const hass = makeHass({ "sensor.url": { state: "unavailable" } });
      manager.evaluateTemplate({ background_image: "{{ states('sensor.url') }}" }, hass);
      expect(document.querySelectorAll("[id^='sgl-bg-']").length).toBe(0);
    });

    it("does nothing when hass is null", () => {
      manager.evaluateTemplate({ background_image: "{{ states('sensor.url') }}" }, null);
      expect(document.querySelectorAll("[id^='sgl-bg-']").length).toBe(0);
    });

    it("falls back to raw template on non-matching pattern", () => {
      manager.evaluateTemplate({ background_image: "https://static.jpg" }, makeHass());
      const bgEl = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl.style.backgroundImage).toContain("static.jpg");
    });

    it("does not update when same image is already set", () => {
      const hass = makeHass({ "sensor.url": { state: "https://img.jpg" } });
      manager.evaluateTemplate({ background_image: "{{ states('sensor.url') }}" }, hass);
      const bgEl1 = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      const id1 = bgEl1.id;

      // Call again with same value — should reuse existing element
      manager.evaluateTemplate({ background_image: "{{ states('sensor.url') }}" }, hass);
      const bgEl2 = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl2.id).toBe(id1);
    });
  });

  // ── destroy ────────────────────────────────────────────────────────────

  describe("destroy", () => {
    it("removes background div from document body", () => {
      manager.setup({ background_image: "https://example.com/bg.jpg" }, makeHass());
      expect(document.querySelectorAll("[id^='sgl-bg-']").length).toBe(1);
      manager.destroy();
      expect(document.querySelectorAll("[id^='sgl-bg-']").length).toBe(0);
    });

    it("is safe to call when no background exists", () => {
      expect(() => manager.destroy()).not.toThrow();
    });

    it("allows re-setup after destroy", () => {
      manager.setup({ background_image: "https://example.com/bg.jpg" }, makeHass());
      manager.destroy();
      // After destroy, a new setup should work (new element ID though)
      const manager2 = new BackgroundManager(host);
      manager2.setup({ background_image: "https://example.com/bg2.jpg" }, makeHass());
      const bgEl = document.querySelector("[id^='sgl-bg-']") as HTMLElement;
      expect(bgEl.style.backgroundImage).toContain("bg2.jpg");
      manager2.destroy();
    });
  });
});
