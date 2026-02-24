/**
 * Manages overlay elements: creation, state-driven activation/deactivation,
 * animation triggering, and the edit-mode test panel.
 */

import { evaluateOverlayContent } from "../template";
import {
  computeOverlayStyles,
  getOverlayAnimation,
  isOverlayActive,
} from "../styles";
import {
  CLASS_OVERLAY,
  CLASS_OVERLAY_CONTENT,
  CLASS_OVERLAY_ACTIVE,
  CLASS_OVERLAY_TESTER,
  CLASS_OVERLAY_TESTER_HEADER,
  CLASS_OVERLAY_TESTER_TITLE,
  CLASS_OVERLAY_TESTER_MINIMIZE,
  CLASS_OVERLAY_TESTER_BODY,
  CLASS_OVERLAY_TESTER_ROW,
  CLASS_OVERLAY_TESTER_LABEL,
  CLASS_OVERLAY_TESTER_BTN,
  ATTR_OVERLAY_INDEX,
  ATTR_ANIMATION,
  DIALOG_SELECTOR,
} from "../constants";
import type { OverlayConfig } from "../types";

export class OverlayManager {
  private _overlayStates: Map<number, boolean> = new Map();
  private _dialogObserver: MutationObserver | null = null;
  private _shadowRoot: ShadowRoot;
  private _hass: any = null;

  constructor(shadowRoot: ShadowRoot) {
    this._shadowRoot = shadowRoot;
  }

  set hass(value: any) {
    this._hass = value;
  }

  /**
   * Recreate all overlay DOM elements from config.
   */
  createOverlays(overlays: OverlayConfig[] | undefined, editMode: boolean): void {
    this._shadowRoot.querySelectorAll(`.${CLASS_OVERLAY}`).forEach(el => el.remove());
    this._shadowRoot.querySelectorAll(`.${CLASS_OVERLAY_TESTER}`).forEach(el => el.remove());
    this._overlayStates.clear();

    if (!overlays?.length) return;

    for (let i = 0; i < overlays.length; i++) {
      const cfg = overlays[i];

      const el = document.createElement("div");
      el.className = CLASS_OVERLAY;
      el.setAttribute(ATTR_OVERLAY_INDEX, String(i));
      el.setAttribute(ATTR_ANIMATION, getOverlayAnimation(cfg));

      for (const [prop, val] of Object.entries(computeOverlayStyles(cfg))) {
        el.style.setProperty(prop, val);
      }

      const contentEl = document.createElement("div");
      contentEl.className = CLASS_OVERLAY_CONTENT;
      if (cfg.text_shadow) contentEl.style.textShadow = cfg.text_shadow;
      el.appendChild(contentEl);

      this._shadowRoot.appendChild(el);
    }

    if (editMode) this._createOverlayTester(overlays);
  }

  /**
   * Update overlay active states based on current HA entity states.
   */
  updateStates(overlays: OverlayConfig[] | undefined, hass: any): void {
    if (!overlays?.length || !hass) return;

    for (let i = 0; i < overlays.length; i++) {
      const cfg = overlays[i];
      const currentState = hass.states[cfg.entity]?.state;
      const active = isOverlayActive(cfg, currentState);
      const wasActive = this._overlayStates.get(i) ?? false;

      const el = this._shadowRoot.querySelector(
        `.${CLASS_OVERLAY}[${ATTR_OVERLAY_INDEX}="${i}"]`
      ) as HTMLElement;
      if (!el) continue;

      const contentEl = el.querySelector(`.${CLASS_OVERLAY_CONTENT}`) as HTMLElement;
      if (contentEl && cfg.content) {
        contentEl.textContent = evaluateOverlayContent(cfg.content, hass.states);
      }

      if (active && !wasActive) {
        el.classList.remove(CLASS_OVERLAY_ACTIVE);
        void el.offsetWidth; // force reflow to restart animation
        el.classList.add(CLASS_OVERLAY_ACTIVE);
      } else if (!active && wasActive) {
        el.classList.remove(CLASS_OVERLAY_ACTIVE);
      }

      this._overlayStates.set(i, active);
    }
  }

  /**
   * Set up MutationObserver to hide overlay tester when HA dialogs are open.
   */
  setupDialogObserver(): void {
    if (this._dialogObserver) return;
    this._dialogObserver = new MutationObserver(() => {
      const tester = this._shadowRoot.querySelector(`.${CLASS_OVERLAY_TESTER}`) as HTMLElement;
      if (!tester) return;
      const dialogOpen = !!document.querySelector(DIALOG_SELECTOR);
      tester.style.display = dialogOpen ? "none" : "";
    });
    this._dialogObserver.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Clean up all state and observers.
   */
  destroy(): void {
    this._overlayStates.clear();
    this._dialogObserver?.disconnect();
    this._dialogObserver = null;
  }

  private _createOverlayTester(overlays: OverlayConfig[]): void {
    const tester = document.createElement("div");
    tester.className = CLASS_OVERLAY_TESTER;

    const header = document.createElement("div");
    header.className = CLASS_OVERLAY_TESTER_HEADER;

    const title = document.createElement("div");
    title.className = CLASS_OVERLAY_TESTER_TITLE;
    title.textContent = "Overlays";

    const minimizeBtn = document.createElement("button");
    minimizeBtn.className = CLASS_OVERLAY_TESTER_MINIMIZE;
    minimizeBtn.textContent = "\u2212";
    minimizeBtn.title = "Minimize";
    minimizeBtn.addEventListener("click", () => {
      const collapsed = tester.classList.toggle("collapsed");
      minimizeBtn.textContent = collapsed ? "+" : "\u2212";
      minimizeBtn.title = collapsed ? "Expand" : "Minimize";
      title.style.display = collapsed ? "none" : "";
      body.style.display = collapsed ? "none" : "";
      tester.style.minWidth = collapsed ? "0" : "";
      tester.style.padding = collapsed ? "4px" : "";
      tester.style.borderRadius = collapsed ? "50%" : "";
    });

    header.append(title, minimizeBtn);
    tester.appendChild(header);

    const body = document.createElement("div");
    body.className = CLASS_OVERLAY_TESTER_BODY;

    for (let i = 0; i < overlays.length; i++) {
      const cfg = overlays[i];
      const row = document.createElement("div");
      row.className = CLASS_OVERLAY_TESTER_ROW;

      const label = document.createElement("span");
      label.className = CLASS_OVERLAY_TESTER_LABEL;
      label.textContent = `${cfg.content || "overlay"} \u2014 ${cfg.entity}`;

      const btn = document.createElement("button");
      btn.className = CLASS_OVERLAY_TESTER_BTN;
      btn.textContent = "Test";
      btn.addEventListener("click", () => this._testOverlay(i, overlays));

      row.append(label, btn);
      body.appendChild(row);
    }

    tester.appendChild(body);
    this._shadowRoot.appendChild(tester);
  }

  private _testOverlay(index: number, overlays: OverlayConfig[]): void {
    const el = this._shadowRoot.querySelector(
      `.${CLASS_OVERLAY}[${ATTR_OVERLAY_INDEX}="${index}"]`
    ) as HTMLElement;
    if (!el) return;

    const cfg = overlays[index];
    if (cfg?.content) {
      const contentEl = el.querySelector(`.${CLASS_OVERLAY_CONTENT}`) as HTMLElement;
      if (contentEl) {
        contentEl.textContent = this._hass
          ? evaluateOverlayContent(cfg.content, this._hass.states)
          : (cfg.content || "");
      }
    }

    el.classList.remove(CLASS_OVERLAY_ACTIVE);
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add(CLASS_OVERLAY_ACTIVE);

    const duration = parseFloat(cfg?.duration || "3") * 1000;
    setTimeout(() => el.classList.remove(CLASS_OVERLAY_ACTIVE), duration + 100);
  }
}
