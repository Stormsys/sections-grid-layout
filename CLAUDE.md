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
│   ├── helpers.ts               # Selector options constant
│   ├── template.ts              # Template evaluation (pure functions)
│   ├── grid-utils.ts            # Grid area parsing and section helpers (pure functions)
│   ├── yaml.ts                  # YAML serializer/parser (pure functions)
│   ├── styles.ts                # CSS generation, section/overlay style computation (pure functions)
│   ├── layouts/
│   │   └── grid.ts              # <sections-grid-layout> -- main file
│   └── patches/
│       ├── hui-view-editor.ts   # Adds "Sections Grid" to view type dropdown
│       └── hui-card-element-editor.ts  # Preserves view_layout on card save
├── tests/
│   ├── template-evaluation.test.ts
│   ├── grid-utils.test.ts
│   ├── yaml.test.ts
│   ├── styles.test.ts
│   └── build-output.test.ts
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
└── GridLayout      (src/layouts/grid.ts)
```

`GridLayout` extends `LitElement` directly (no base class).

### `grid.ts`
- **CSS Grid rendering**: Applies `grid-template-areas/columns/rows` from `layout` config
- **Section management**: Creates/destroys `hui-section` wrappers; maintains `_sectionsCache`; auto-saves new sections to lovelace config
- **Jinja template evaluation**: Calls pure functions from `template.ts` for `{{ states() }}`, `{{ state_attr() }}`, `{% if %}` in `custom_css`; tracks entities in `_trackedEntities`; debounced via `requestAnimationFrame`
- **Background images**: Fixed positioning, blur, opacity, template support
- **Kiosk mode**: `layout.kiosk: true` makes `#root` fixed-position, filling viewport below HA header; edit-mode offset adjusts for tab bar
- **Layout zoom**: `layout.zoom` applies CSS `zoom` to `#root`
- **Per-section styling**: `scrollable`, `background`, `backdrop_blur`, `zoom`, `overflow`, `padding`, `tint`, `variables`, `mediaquery` on each section
- **Edit mode UI**: Section labels with grid-area name; loose-cards container for orphan cards; overlay tester panel
- **`_updateSectionsLovelace()`**: Pushes fresh `lovelace` AND fresh `config` to each `hui-section`

### Extracted utility modules (pure functions, testable without DOM)
- **`template.ts`**: `evaluateCssTemplates()`, `evaluateOverlayContent()`, `extractEntitiesFromTemplate()`
- **`grid-utils.ts`**: `detectAllGridAreas()`, `formatAreaName()`, `ensureSectionsForAllAreas()`
- **`yaml.ts`**: `sectionConfigToYaml()`, `yamlScalar()`, `parseYaml()`
- **`styles.ts`**: CSS generators (kiosk, tint, blur, zoom, variables, mediaquery), section/overlay style computation, breakpoint resolution

### `patches/hui-view-editor.ts`
Adds `sections-grid-layout` to the view type dropdown. Guard flag `_sectionsGridLayoutPatched` prevents double-patching when layout-card is also loaded.

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
| Negative | `{% if not is_state('binary_sensor.dark', 'on') %}...{% endif %}` |

---

## Key Files for Common Tasks

| Task | File |
|---|---|
| Grid rendering / section logic | `src/layouts/grid.ts` |
| Template evaluation | `src/template.ts` |
| Grid area parsing | `src/grid-utils.ts` |
| YAML serializer/parser | `src/yaml.ts` |
| CSS generation / styling | `src/styles.ts` |
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
