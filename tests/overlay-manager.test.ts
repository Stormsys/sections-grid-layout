// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OverlayManager } from "../src/managers/overlay-manager";
import type { OverlayConfig } from "../src/types";

function makeShadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  return host.attachShadow({ mode: "open" });
}

function makeHass(states: Record<string, { state: string; attributes?: Record<string, any> }> = {}) {
  return { states };
}

function makeOverlay(overrides: Partial<OverlayConfig> = {}): OverlayConfig {
  return {
    entity: "binary_sensor.motion",
    state: "on",
    content: "Motion!",
    animation: "pulse",
    ...overrides,
  };
}

describe("OverlayManager", () => {
  let shadowRoot: ShadowRoot;
  let manager: OverlayManager;

  beforeEach(() => {
    shadowRoot = makeShadowRoot();
    manager = new OverlayManager(shadowRoot);
  });

  afterEach(() => {
    manager.destroy();
  });

  // ── createOverlays ─────────────────────────────────────────────────────

  describe("createOverlays", () => {
    it("creates overlay div for each config entry", () => {
      const overlays = [makeOverlay(), makeOverlay({ entity: "binary_sensor.door" })];
      manager.createOverlays(overlays, false);
      expect(shadowRoot.querySelectorAll(".sgl-overlay").length).toBe(2);
    });

    it("does nothing when overlays is undefined", () => {
      manager.createOverlays(undefined, false);
      expect(shadowRoot.querySelectorAll(".sgl-overlay").length).toBe(0);
    });

    it("does nothing when overlays is empty", () => {
      manager.createOverlays([], false);
      expect(shadowRoot.querySelectorAll(".sgl-overlay").length).toBe(0);
    });

    it("sets data-animation attribute from config", () => {
      manager.createOverlays([makeOverlay({ animation: "fade" })], false);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.getAttribute("data-animation")).toBe("fade");
    });

    it("defaults animation to pulse", () => {
      manager.createOverlays([makeOverlay({ animation: undefined })], false);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.getAttribute("data-animation")).toBe("pulse");
    });

    it("sets data-overlay-index attribute", () => {
      manager.createOverlays([makeOverlay(), makeOverlay()], false);
      const els = shadowRoot.querySelectorAll(".sgl-overlay");
      expect(els[0].getAttribute("data-overlay-index")).toBe("0");
      expect(els[1].getAttribute("data-overlay-index")).toBe("1");
    });

    it("creates content element inside overlay", () => {
      manager.createOverlays([makeOverlay()], false);
      const content = shadowRoot.querySelector(".sgl-overlay-content");
      expect(content).not.toBeNull();
    });

    it("applies text_shadow to content element", () => {
      manager.createOverlays([makeOverlay({ text_shadow: "0 0 10px black" })], false);
      const content = shadowRoot.querySelector(".sgl-overlay-content") as HTMLElement;
      expect(content.style.textShadow).toBe("0 0 10px black");
    });

    it("creates tester panel when editMode is true", () => {
      manager.createOverlays([makeOverlay()], true);
      expect(shadowRoot.querySelector(".sgl-overlay-tester")).not.toBeNull();
    });

    it("does not create tester when editMode is false", () => {
      manager.createOverlays([makeOverlay()], false);
      expect(shadowRoot.querySelector(".sgl-overlay-tester")).toBeNull();
    });

    it("clears existing overlays before creating new ones", () => {
      manager.createOverlays([makeOverlay()], false);
      expect(shadowRoot.querySelectorAll(".sgl-overlay").length).toBe(1);
      manager.createOverlays([makeOverlay(), makeOverlay()], false);
      expect(shadowRoot.querySelectorAll(".sgl-overlay").length).toBe(2);
    });

    it("applies CSS variables from overlay config", () => {
      manager.createOverlays([makeOverlay({ color: "red", font_size: "40px" })], false);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.style.getPropertyValue("--sgl-overlay-color")).toBe("red");
      expect(el.style.getPropertyValue("--sgl-overlay-font-size")).toBe("40px");
    });
  });

  // ── updateStates ───────────────────────────────────────────────────────

  describe("updateStates", () => {
    it("adds active class when entity state matches", () => {
      const overlays = [makeOverlay({ state: "on" })];
      manager.createOverlays(overlays, false);
      const hass = makeHass({ "binary_sensor.motion": { state: "on" } });
      manager.updateStates(overlays, hass);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(true);
    });

    it("does not add active class when state does not match", () => {
      const overlays = [makeOverlay({ state: "on" })];
      manager.createOverlays(overlays, false);
      const hass = makeHass({ "binary_sensor.motion": { state: "off" } });
      manager.updateStates(overlays, hass);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(false);
    });

    it("removes active class when entity state no longer matches", () => {
      const overlays = [makeOverlay({ state: "on" })];
      manager.createOverlays(overlays, false);

      // First: activate
      const hassOn = makeHass({ "binary_sensor.motion": { state: "on" } });
      manager.updateStates(overlays, hassOn);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(true);

      // Then: deactivate
      const hassOff = makeHass({ "binary_sensor.motion": { state: "off" } });
      manager.updateStates(overlays, hassOff);
      expect(el.classList.contains("active")).toBe(false);
    });

    it("does not toggle when state has not changed", () => {
      const overlays = [makeOverlay({ state: "on" })];
      manager.createOverlays(overlays, false);
      const hass = makeHass({ "binary_sensor.motion": { state: "on" } });

      manager.updateStates(overlays, hass);
      manager.updateStates(overlays, hass);

      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(true);
    });

    it("evaluates content templates", () => {
      const overlays = [makeOverlay({ content: "Temp: {{ states('sensor.temp') }}" })];
      manager.createOverlays(overlays, false);
      const hass = makeHass({
        "binary_sensor.motion": { state: "on" },
        "sensor.temp": { state: "22" },
      });
      manager.updateStates(overlays, hass);
      const content = shadowRoot.querySelector(".sgl-overlay-content") as HTMLElement;
      expect(content.textContent).toBe("Temp: 22");
    });

    it("does nothing when hass is null", () => {
      const overlays = [makeOverlay()];
      manager.createOverlays(overlays, false);
      manager.updateStates(overlays, null);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(false);
    });

    it("does nothing when overlays is empty", () => {
      expect(() => manager.updateStates([], makeHass())).not.toThrow();
    });

    it("defaults target state to 'on' when state is not specified", () => {
      const overlays = [makeOverlay({ state: undefined })];
      manager.createOverlays(overlays, false);
      const hass = makeHass({ "binary_sensor.motion": { state: "on" } });
      manager.updateStates(overlays, hass);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(true);
    });
  });

  // ── destroy ────────────────────────────────────────────────────────────

  describe("destroy", () => {
    it("clears overlay states map", () => {
      const overlays = [makeOverlay()];
      manager.createOverlays(overlays, false);
      manager.updateStates(overlays, makeHass({ "binary_sensor.motion": { state: "on" } }));
      manager.destroy();
      // After destroy + recreate, state should be fresh
      manager.createOverlays(overlays, false);
      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(false);
    });

    it("is safe to call multiple times", () => {
      expect(() => {
        manager.destroy();
        manager.destroy();
      }).not.toThrow();
    });
  });

  // ── overlay tester ─────────────────────────────────────────────────────

  describe("overlay tester", () => {
    it("shows overlay labels with entity names", () => {
      const overlays = [makeOverlay({ content: "Alert", entity: "binary_sensor.motion" })];
      manager.createOverlays(overlays, true);
      const label = shadowRoot.querySelector(".sgl-overlay-tester-label") as HTMLElement;
      expect(label.textContent).toContain("Alert");
      expect(label.textContent).toContain("binary_sensor.motion");
    });

    it("has test button for each overlay", () => {
      const overlays = [makeOverlay(), makeOverlay({ entity: "binary_sensor.door" })];
      manager.createOverlays(overlays, true);
      const buttons = shadowRoot.querySelectorAll(".sgl-overlay-tester-btn");
      expect(buttons.length).toBe(2);
    });

    it("test button activates overlay", () => {
      vi.useFakeTimers();
      const overlays = [makeOverlay({ duration: "1" })];
      manager.hass = makeHass();
      manager.createOverlays(overlays, true);

      const btn = shadowRoot.querySelector(".sgl-overlay-tester-btn") as HTMLElement;
      btn.click();

      const el = shadowRoot.querySelector(".sgl-overlay") as HTMLElement;
      expect(el.classList.contains("active")).toBe(true);

      // After duration + 100ms, should deactivate
      vi.advanceTimersByTime(1100);
      expect(el.classList.contains("active")).toBe(false);

      vi.useRealTimers();
    });
  });
});
