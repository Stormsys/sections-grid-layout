# CLAUDE.md — AI Assistant Guide for sections-grid-layout

This file provides context for AI assistants working in this repository.

---

## Project Overview

**sections-grid-layout** is a Home Assistant Lovelace custom **view** plugin that places native HA `hui-section` elements into a CSS Grid with Jinja template evaluation and responsive design support.

- **Version**: 1.0.0
- **License**: MIT
- **Author**: Stormsys
- **HA minimum version**: 2024.2.0 (native Sections view required)
- **Distribution**: HACS
- **Compiled output**: `sections-grid-layout.js`

The project registers one view layout element (`sections-grid-layout`) plus two helper cards (`gap-card-sgl`, `layout-break-sgl`). It coexists safely with the stock `layout-card`.

---

## Repository Layout

```
/
├── src/
│   ├── main.ts                  # Entry point
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── helpers.ts               # Utility functions + selector options
│   ├── gap-card.ts              # <gap-card-sgl>
│   ├── layout-break.ts          # <layout-break-sgl>
│   └── layouts/
│       ├── base-layout.ts       # Abstract LitElement base
│       └── grid.ts              # <sections-grid-layout> — main file
│   └── patches/
│       ├── hui-view-editor.ts   # Adds "Sections Grid" to view type dropdown
│       └── hui-card-element-editor.ts  # Preserves view_layout on card save
├── rollup.config.js
├── tsconfig.json
├── package.json
├── hacs.json
├── sections-grid-layout.js      # Compiled output — DO NOT edit
└── README.md
```

---

## Build System

```bash
npm install
npm run build    # Production build → sections-grid-layout.js
npm run watch    # Watch mode (no minification)
```

---

## Custom Elements

| Element | File | Role |
|---|---|---|
| `sections-grid-layout` | layouts/grid.ts | CSS Grid view layout |
| `gap-card-sgl` | gap-card.ts | Spacing card |
| `layout-break-sgl` | layout-break.ts | Flow break card |

---

## Architecture

```
LitElement
└── BaseLayout          (base-layout.ts)
    └── GridLayout      (layouts/grid.ts)
```

### `base-layout.ts`
Abstract base. Manages `editMode`, card visibility, and the FAB (suppressed in sections mode by GridLayout's `_render_fab()` override).

### `grid.ts`
- **CSS Grid rendering**: Applies `grid-template-areas/columns/rows` from `layout` config
- **Section management**: Creates/destroys `hui-section` wrappers; maintains `_sectionsCache`; auto-saves new sections to lovelace config
- **Jinja template evaluation**: Evaluates `{{ states() }}`, `{{ state_attr() }}`, `{% if %}` in `custom_css`; tracks entities in `_trackedEntities`; debounced via `requestAnimationFrame`
- **Background images**: Fixed positioning, blur, opacity, template support
- **Kiosk mode**: `layout.kiosk: true` makes `#root` fixed-position, filling viewport below HA header; edit-mode offset adjusts for tab bar
- **Layout zoom**: `layout.zoom` applies CSS `zoom` to `#root`
- **Per-section styling**: `scrollable`, `background`, `backdrop_blur`, `zoom`, `overflow` on each `SectionConfig` — applied as classes/inline styles on `.section-container`
- **Edit mode UI**: Section labels with grid-area name; loose-cards container for orphan cards
- **`_updateSectionsLovelace()`**: Pushes fresh `lovelace` AND fresh `config` (looked up by `grid_area`) to each `hui-section` so it never renders from a stale snapshot

### `patches/hui-view-editor.ts`
Adds only `sections-grid-layout` to the view type dropdown. Guard flag `_sectionsGridLayoutPatched` prevents double-patching when layout-card is also loaded.

### `patches/hui-card-element-editor.ts`
Preserves `view_layout` when the card element editor saves changes.

---

## Code Conventions

- Private methods/props: `_` prefix
- Constants: `UPPER_SNAKE_CASE`
- `@property()` for external props, `@state()` for internal state
- Clean up observers in `disconnectedCallback()`
- Debounce heavy ops with `requestAnimationFrame`
- Lit 3 only

---

## Template System (`custom_css`)

| Syntax | Example |
|---|---|
| State value | `{{ states('sensor.temperature') }}` |
| Attribute value | `{{ state_attr('climate.living', 'temperature') }}` |
| Conditional | `{% if is_state('binary_sensor.dark', 'on') %}...{% endif %}` |

---

## Key Files for Common Tasks

| Task | File |
|---|---|
| Grid rendering / section logic | `src/layouts/grid.ts` |
| Base layout / FAB behaviour | `src/layouts/base-layout.ts` |
| Shared types | `src/types.ts` |
| View type dropdown | `src/patches/hui-view-editor.ts` |
| view_layout preservation | `src/patches/hui-card-element-editor.ts` |

---

## Compatibility with layout-card

- Only `sections-grid-layout` is registered — masonry/horizontal/vertical are untouched
- Patch guard is `_sectionsGridLayoutPatched` (distinct from layout-card's guard)
- Both can be loaded simultaneously without conflict

---

## Constraints

- **Never edit `sections-grid-layout.js` directly** — overwritten on build
- **HA 2024.2+ only** — `hui-section` did not exist before that release
- **No automated tests** — validate manually via Docker or real HA instance
