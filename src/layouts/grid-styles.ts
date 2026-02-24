import { css } from "lit";

export const gridStyles = css`
  ha-fab {
    position: fixed;
    right: calc(16px + env(safe-area-inset-right));
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 1;
  }
  :host {
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  #root {
    display: grid;
    justify-content: stretch;
    margin: var(--layout-margin);
    padding: var(--layout-padding);
    flex: 1;
    min-height: 0;
    overflow-y: var(--layout-overflow);
  }
  #root > *:not(.loose-cards-container) {
    margin: var(--grid-section-margin, 4px 4px 8px);
  }

  /* Section containers */
  .section-container {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--section-padding, 10px);
  }
  .section-container.scrollable {
    overflow-y: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .section-container.scrollable::-webkit-scrollbar {
    display: none;
  }
  .section-container.edit-mode {
    border: 2px dashed var(--primary-color, #03a9f4);
    border-radius: 8px;
    padding: 8px;
    background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.05);
    transition: all 0.2s ease;
  }
  .section-container.edit-mode:hover {
    background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1);
    border-color: var(--accent-color, #ff9800);
  }
  .section-grid-label {
    position: absolute;
    bottom: 4px;
    right: 4px;
    display: inline-flex;
    align-items: center;
    background: var(--primary-color, #03a9f4);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.4;
    z-index: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(4px);
    transition: opacity 0.15s;
    cursor: pointer;
    pointer-events: auto;
    white-space: nowrap;
    overflow: hidden;
  }
  .section-grid-edit-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .section-grid-label:hover .section-grid-edit-overlay {
    opacity: 1;
  }
  .section-container.edit-mode:hover .section-grid-label {
    opacity: 0.7;
  }
  .section-container.edit-mode:has(hui-section:empty),
  .section-container.edit-mode:has(hui-section[cards=""]) {
    border-style: dotted;
    background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.02);
  }
  .section-container.edit-mode:has(hui-section:empty):hover,
  .section-container.edit-mode:has(hui-section[cards=""]):hover {
    background: rgba(var(--rgb-accent-color, 255, 152, 0), 0.08);
    border-color: var(--accent-color, #ff9800);
  }

  /* Loose cards container (edit mode only, for orphan view-level cards) */
  .loose-cards-container {
    grid-column: 1 / -1;
    margin-top: 24px;
    padding: 16px;
    border: 2px dashed var(--warning-color, #ff9800);
    border-radius: 8px;
    background: rgba(255, 152, 0, 0.05);
  }
  .loose-cards-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .loose-cards-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--warning-color, #ff9800);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .loose-cards-subtitle {
    font-size: 13px;
    color: var(--secondary-text-color, #727272);
    font-style: italic;
  }
  .loose-cards-wrapper {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
  }
  .loose-cards-wrapper > * {
    margin: 0;
  }

  /* ── Section YAML editor ──────────────────────────────────────── */

  .sgl-yaml-editor {
    position: fixed;
    inset: 0;
    z-index: 8;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }
  .sgl-yaml-dialog {
    background: var(--card-background-color, #1c1c1c);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    min-width: 400px;
    max-width: 640px;
    width: 90vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
  }
  .sgl-yaml-header {
    font-size: 14px;
    font-weight: 700;
    color: var(--primary-text-color, #fff);
    margin-bottom: 12px;
    flex-shrink: 0;
  }
  .sgl-yaml-editor-container {
    flex: 1;
    min-height: 300px;
    max-height: 60vh;
    overflow: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }
  .sgl-yaml-editor-container ha-code-editor {
    display: block;
    --code-mirror-height: 100%;
  }
  .sgl-yaml-textarea {
    width: 100%;
    height: 100%;
    min-height: 300px;
    background: rgba(0, 0, 0, 0.2);
    color: var(--primary-text-color, #fff);
    border: none;
    padding: 12px;
    font-family: "Roboto Mono", "SFMono-Regular", monospace;
    font-size: 13px;
    line-height: 1.5;
    resize: none;
    box-sizing: border-box;
    tab-size: 2;
  }
  .sgl-yaml-textarea:focus {
    outline: none;
  }
  .sgl-yaml-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
    flex-shrink: 0;
  }
  .sgl-yaml-btn {
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .sgl-yaml-btn:hover { opacity: 0.85; }
  .sgl-yaml-btn-cancel {
    background: rgba(255, 255, 255, 0.1);
    color: var(--primary-text-color, #fff);
  }
  .sgl-yaml-btn-save {
    background: var(--primary-color, #03a9f4);
    color: white;
  }

  /* ── Overlays ─────────────────────────────────────────────────── */

  .sgl-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    z-index: var(--sgl-overlay-z-index, 9999);
  }
  .sgl-overlay-content {
    font-size: var(--sgl-overlay-font-size, 80px);
    font-weight: 200;
    color: var(--sgl-overlay-color, white);
  }

  /* Pulse */
  .sgl-overlay[data-animation="pulse"] {
    background:
      radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.3) 0%, transparent 70%);
    background-size: 0% 0%, 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
  }
  .sgl-overlay.active[data-animation="pulse"] {
    animation: sgl-pulse var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .sgl-overlay.active[data-animation="pulse"] .sgl-overlay-content {
    animation: sgl-pulse-content var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes sgl-pulse {
    0%   { opacity: 0; backdrop-filter: blur(0px); background-size: 0% 0%, 100% 100%; }
    15%  { opacity: 1; backdrop-filter: blur(var(--sgl-overlay-blur, 6px)); background-size: 120% 120%, 100% 100%; }
    60%  { opacity: 1; backdrop-filter: blur(var(--sgl-overlay-blur, 6px)); background-size: 250% 250%, 100% 100%; }
    100% { opacity: 0; backdrop-filter: blur(0px); background-size: 400% 400%, 100% 100%; }
  }
  @keyframes sgl-pulse-content {
    0%   { transform: scale(0); opacity: 0; text-shadow: none; }
    20%  { transform: scale(1.4); opacity: 1; text-shadow: 0 0 40px currentColor, 0 0 100px currentColor; }
    35%  { transform: scale(1); text-shadow: 0 0 30px currentColor, 0 0 80px currentColor; }
    60%  { opacity: 1; text-shadow: 0 0 20px currentColor; }
    100% { transform: scale(1); opacity: 0; text-shadow: none; }
  }

  /* Fade */
  .sgl-overlay.active[data-animation="fade"] {
    animation: sgl-fade var(--sgl-overlay-duration, 3s) ease forwards;
  }
  .sgl-overlay.active[data-animation="fade"] .sgl-overlay-content {
    animation: sgl-fade var(--sgl-overlay-duration, 3s) ease forwards;
  }
  @keyframes sgl-fade {
    0%   { opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 1; }
    100% { opacity: 0; }
  }

  /* Flash */
  .sgl-overlay.active[data-animation="flash"] {
    animation: sgl-flash var(--sgl-overlay-duration, 1.5s) ease-out forwards;
  }
  .sgl-overlay.active[data-animation="flash"] .sgl-overlay-content {
    animation: sgl-flash-content var(--sgl-overlay-duration, 1.5s) ease-out forwards;
  }
  @keyframes sgl-flash {
    0%   { opacity: 0; backdrop-filter: blur(0px); }
    8%   { opacity: 1; backdrop-filter: blur(var(--sgl-overlay-blur, 4px)); }
    20%  { opacity: 1; }
    100% { opacity: 0; backdrop-filter: blur(0px); }
  }
  @keyframes sgl-flash-content {
    0%   { transform: scale(0.5); opacity: 0; }
    8%   { transform: scale(1.2); opacity: 1; }
    20%  { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0; }
  }

  /* Slide Up */
  .sgl-overlay.active[data-animation="slide-up"] {
    animation: sgl-slide-up var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .sgl-overlay.active[data-animation="slide-up"] .sgl-overlay-content {
    animation: sgl-slide-up-content var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes sgl-slide-up {
    0%   { opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes sgl-slide-up-content {
    0%   { transform: translateY(100px); opacity: 0; }
    20%  { transform: translateY(0); opacity: 1; }
    80%  { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-30px); opacity: 0; }
  }

  /* None (static — visible while state matches) */
  .sgl-overlay.active[data-animation="none"] {
    opacity: 1;
  }
  .sgl-overlay.active[data-animation="none"] .sgl-overlay-content {
    opacity: 1;
  }

  /* ── Overlay tester (edit mode) ──────────────────────────────── */

  .sgl-overlay-tester {
    position: fixed;
    bottom: 80px;
    right: calc(16px + env(safe-area-inset-right));
    z-index: 7;
    background: color-mix(in srgb, var(--card-background-color, #1c1c1c) 75%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 10px 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    min-width: 200px;
    max-width: 320px;
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    transition: padding 0.2s ease, min-width 0.2s ease, border-radius 0.2s ease;
  }
  .sgl-overlay-tester.collapsed {
    min-width: 0;
    padding: 4px 6px;
    border-radius: 8px;
  }
  .sgl-overlay-tester-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .sgl-overlay-tester-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--primary-color, #03a9f4);
    transition: font-size 0.2s ease, width 0.2s ease, opacity 0.2s ease;
    overflow: hidden;
  }
  .sgl-overlay-tester.collapsed .sgl-overlay-tester-title {
    font-size: 0;
    width: 0;
    opacity: 0;
  }
  .sgl-overlay-tester-minimize {
    background: none;
    border: none;
    color: var(--secondary-text-color, #aaa);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 0 2px;
    pointer-events: auto;
    transition: color 0.15s;
  }
  .sgl-overlay-tester-minimize:hover {
    color: var(--primary-text-color, #fff);
  }
  .sgl-overlay-tester-body {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    transition: max-height 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
    max-height: 400px;
    opacity: 1;
  }
  .sgl-overlay-tester.collapsed .sgl-overlay-tester-body {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
  .sgl-overlay-tester-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 0;
  }
  .sgl-overlay-tester-label {
    font-size: 12px;
    color: var(--primary-text-color, #fff);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .sgl-overlay-tester-btn {
    background: var(--primary-color, #03a9f4);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;
    pointer-events: auto;
  }
  .sgl-overlay-tester-btn:hover {
    opacity: 0.85;
  }
  .sgl-overlay-tester-btn:active {
    opacity: 0.7;
  }
`;
