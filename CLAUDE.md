# CLAUDE.md -- AI Assistant Guide for sections-grid-layout

---

## Project Overview

**sections-grid-layout** is a Home Assistant Lovelace custom **view** plugin that places native HA `hui-section` elements into a CSS Grid with Jinja template evaluation and responsive design support.

- **Version**: 0.1.0-alpha
- **License**: MIT
- **Author**: Stormsys
- **HA minimum version**: 2024.2.0 (native Sections view required)
- **Distribution**: HACS
- **Compiled output**: `sections-grid-layout.js`

The project registers one custom element (`sections-grid-layout`) and two patches. It coexists safely with the stock `layout-card`.

---

## Repository Layout

```
/
├── src/
│   ├── main.ts                  # Entry point
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── constants.ts             # CSS class names, IDs, data attributes
│   ├── helpers.ts               # Selector options constant
│   ├── template.ts              # Template evaluation (pure functions)
│   ├── grid-utils.ts            # Grid area parsing and section helpers (pure functions)
│   ├── yaml.ts                  # YAML serializer/parser (pure functions)
│   ├── styles.ts                # CSS generation, section/overlay style computation (pure functions)
│   ├── layouts/
│   │   ├── grid.ts              # <sections-grid-layout> -- main coordinator
│   │   └── grid-styles.ts       # Static CSS for the component
│   ├── managers/
│   │   ├── background-manager.ts    # Background image lifecycle
│   │   ├── overlay-manager.ts       # Overlay creation, state, tester panel
│   │   └── section-config-manager.ts # Section CRUD, YAML editor modal
│   └── patches/
│       ├── hui-view-editor.ts   # Adds "Sections Grid" to view type dropdown
│       └── hui-card-element-editor.ts  # Preserves view_layout on card save
├── tests/
│   ├── template-evaluation.test.ts
│   ├── grid-utils.test.ts
│   ├── yaml.test.ts
│   ├── styles.test.ts
│   ├── build-output.test.ts
│   ├── background-manager.test.ts
│   ├── overlay-manager.test.ts
│   └── section-config-manager.test.ts
├── rollup.config.js
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── hacs.json
├── sections-grid-layout.js      # Compiled output -- DO NOT edit
├── CHANGELOG.md
└── README.md
```

---

## Build & Test

```bash
npm install
npm run build        # Production build -> sections-grid-layout.js
npm run watch        # Watch mode (no minification)
npm test             # Run unit tests (vitest)
npm run test:watch   # Watch mode for tests
```

---

## Architecture

```
LitElement
└── GridLayout      (src/layouts/grid.ts)  ← coordinator
    ├── BackgroundManager   (src/managers/background-manager.ts)
    ├── OverlayManager      (src/managers/overlay-manager.ts)
    └── SectionConfigManager (src/managers/section-config-manager.ts)
```

`GridLayout` extends `LitElement` directly (no base class). It coordinates three managers that own distinct subsystems.

### `grid.ts` (coordinator)
- **CSS Grid rendering**: Applies `grid-template-areas/columns/rows` from `layout` config
- **Section placement**: Creates `hui-section` wrappers; maintains `_sectionsCache`
- **Jinja template evaluation**: Calls pure functions from `template.ts`; tracks entities in `_trackedEntities`; debounced via `requestAnimationFrame`
- **Kiosk mode**: `layout.kiosk: true` makes `#root` fixed-position
- **Layout zoom**: `layout.zoom` applies CSS `zoom` to `#root`
- **Per-section styling**: `scrollable`, `background`, `backdrop_blur`, `zoom`, `overflow`, `padding`, `tint`, `variables`, `mediaquery`
- **Edit mode UI**: Section labels with grid-area name; loose-cards container
- **`_updateSectionsLovelace()`**: Pushes fresh `lovelace` AND fresh `config` to each `hui-section`

### `grid-styles.ts`
Static CSS for the component (~450 lines). Includes section containers, YAML editor modal, overlay animations, and overlay tester panel styling.

### Managers
- **`BackgroundManager`**: Owns background image lifecycle — creates a fixed-position div on `document.body`, handles template evaluation for dynamic URLs, manages blur/opacity. State: `_lastBackgroundImage`, `_bgElementId`.
- **`OverlayManager`**: Owns overlay DOM elements, state-driven activation/deactivation, animation triggering, and the edit-mode test panel. State: `_overlayStates`, `_dialogObserver`.
- **`SectionConfigManager`**: Owns section config CRUD (create/update/delete sections in lovelace config), auto-creation of missing sections for grid areas, and the YAML editor modal. State: `_savingConfig`.

### Extracted utility modules (pure functions, testable without DOM)
- **`template.ts`**: `evaluateCssTemplates()`, `evaluateOverlayContent()`, `extractEntitiesFromTemplate()`
- **`grid-utils.ts`**: `detectAllGridAreas()`, `formatAreaName()`, `ensureSectionsForAllAreas()`
- **`yaml.ts`**: `sectionConfigToYaml()`, `yamlScalar()`, `parseYaml()`
- **`styles.ts`**: CSS generators (kiosk, tint, blur, zoom, variables, mediaquery), section/overlay style computation, breakpoint resolution
- **`constants.ts`**: Shared CSS class names, element IDs, data attributes, and selectors

### `patches/hui-view-editor.ts`
Adds `sections-grid-layout` to the view type dropdown. Guard flag `_sectionsGridLayoutPatched` prevents double-patching when layout-card is also loaded.

### `patches/hui-card-element-editor.ts`
Preserves `view_layout` when the card element editor saves changes.

---

## Code Conventions

- Private methods/props: `_` prefix
- Constants: `UPPER_SNAKE_CASE` (in `constants.ts`)
- `@property()` for external props, `@state()` for internal state
- Clean up observers in `disconnectedCallback()`
- Debounce heavy ops with `requestAnimationFrame`
- Lit 3 only
- Manager classes are instantiated in `firstUpdated()` and cleaned up in `disconnectedCallback()`
- CSS class names used in JS should reference constants from `constants.ts`

---

## Template System (`custom_css`)

| Syntax | Example |
|---|---|
| State value | `{{ states('sensor.temperature') }}` |
| Attribute value | `{{ state_attr('climate.living', 'temperature') }}` |
| Conditional | `{% if is_state('binary_sensor.dark', 'on') %}...{% endif %}` |
| Negative | `{% if not is_state('binary_sensor.dark', 'on') %}...{% endif %}` |

---

## Key Files for Common Tasks

| Task | File |
|---|---|
| Grid rendering / section placement | `src/layouts/grid.ts` |
| Component CSS | `src/layouts/grid-styles.ts` |
| Background image handling | `src/managers/background-manager.ts` |
| Overlay creation & state | `src/managers/overlay-manager.ts` |
| Section config CRUD & YAML editor | `src/managers/section-config-manager.ts` |
| Template evaluation | `src/template.ts` |
| Grid area parsing | `src/grid-utils.ts` |
| YAML serializer/parser | `src/yaml.ts` |
| CSS generation / styling | `src/styles.ts` |
| CSS class/ID constants | `src/constants.ts` |
| Shared types | `src/types.ts` |
| View type dropdown | `src/patches/hui-view-editor.ts` |
| view_layout preservation | `src/patches/hui-card-element-editor.ts` |

---

## Compatibility with layout-card

- Only `sections-grid-layout` is registered -- masonry/horizontal/vertical are untouched
- Patch guard is `_sectionsGridLayoutPatched` (distinct from layout-card's guard)
- Both can be loaded simultaneously without conflict

---

## Constraints

- **Never edit `sections-grid-layout.js` directly** -- overwritten on build
- **HA 2024.2+ only** -- `hui-section` did not exist before that release

---

## Known Gaps

- `background_blur` is NOT handled in layout-level `mediaquery` overrides (only works at base level)
