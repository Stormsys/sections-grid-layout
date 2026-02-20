# Sections Grid Layout

> **Alpha** — this is pre-release software. APIs, element names, and YAML keys may change before v1.0. Test on a non-production HA instance.

A Home Assistant Lovelace **view** plugin that places native HA sections into a CSS Grid.

Requires **Home Assistant 2024.2+** (when native Sections views were introduced).

---

## What it does

Home Assistant's built-in Sections view arranges sections in a simple responsive column grid. This plugin replaces that with a full CSS Grid, letting you:

- Define a `grid-template-areas` layout and assign each section to a named area
- Use `grid-template-columns` / `grid-template-rows` for precise sizing
- Write Jinja-like `{{ states('...') }}` / `{% if %}` expressions inside `custom_css` so the layout responds to entity state
- Set per-view background images (with blur and opacity), also template-evaluated
- Apply responsive overrides via `mediaquery` blocks

All sections are standard HA `hui-section` elements — card dragging, the section + button, and the section title editor all work exactly as they do in the native Sections view.

---

## Installation (HACS)

1. Add this repository as a custom HACS repository (type: **Lovelace**)
2. Install **Sections Grid Layout** from HACS
3. Add the resource in Settings → Dashboards → Resources:
   ```
   /hacsfiles/sections-grid-layout/sections-grid-layout.js
   ```

---

## Usage

Set the view type to `custom:sections-grid-layout` and give each section a `grid_area`:

```yaml
title: My View
type: custom:sections-grid-layout
layout:
  grid-template-areas: |
    "header header"
    "left   right"
    "footer footer"
  grid-template-columns: 1fr 2fr
  grid-template-rows: auto 1fr auto
sections:
  - grid_area: header
    type: grid
    cards:
      - type: weather-forecast
        entity: weather.home
  - grid_area: left
    type: grid
    cards:
      - type: entities
        entities:
          - light.living_room
  - grid_area: right
    type: grid
    cards:
      - type: history-graph
        entities:
          - sensor.temperature
  - grid_area: footer
    type: grid
    cards:
      - type: markdown
        content: Last updated {{ now() }}
```

### Full `layout` options

| Key | Type | Description |
|---|---|---|
| `grid-template-areas` | string | CSS grid-template-areas value |
| `grid-template-columns` | string | CSS grid-template-columns value |
| `grid-template-rows` | string | CSS grid-template-rows value |
| `custom_css` | string | Extra CSS injected into the view; supports Jinja templates |
| `background_image` | string | Background image URL or Jinja template |
| `background_blur` | string | CSS blur value e.g. `"8px"` |
| `background_opacity` | number | 0–1 opacity for the background |
| `tint` | string | Semi-transparent background colour on the grid (e.g. `"#00000020"`) |
| `backdrop_blur` | string | CSS blur applied to the grid via `backdrop-filter` e.g. `"10px"` |
| `variables` | object | CSS custom properties injected on `:host` (see below) |
| `breakpoints` | object | Named media queries for reuse (see below) |
| `mediaquery` | object | Responsive overrides — keys can be raw queries or named breakpoints (see below) |
| `margin` | string | Outer margin of the grid |
| `padding` | string | Inner padding of the grid |
| `kiosk` | boolean | Fixed-position layout filling the viewport below the header |
| `zoom` | number/string | CSS zoom applied to the entire grid (e.g. `0.9`) |
| `overlays` | list | Full-screen animated notifications triggered by entity state (see below) |

### Per-section options

Each section can have these additional properties alongside `grid_area`, `type`, and `cards`:

| Key | Type | Description |
|---|---|---|
| `scrollable` | boolean | Makes the section scrollable with hidden scrollbars |
| `background` | string | CSS background value (color, gradient, image) |
| `backdrop_blur` | string | CSS blur value applied as `backdrop-filter` e.g. `"10px"` |
| `zoom` | number/string | CSS zoom applied to this section (e.g. `0.85`) |
| `overflow` | string | CSS overflow value (`hidden`, `auto`, `scroll`, etc.) |
| `padding` | string | Section padding (default: `10px` via `--section-padding`) |
| `tint` | string | Semi-transparent background colour (e.g. `"#20293cdd"`) |
| `variables` | object | CSS custom properties scoped to this section (e.g. `{ primary-background-color: none }`) |
| `mediaquery` | object | Per-section responsive overrides (see below) |

```yaml
sections:
  - grid_area: sidebar
    type: grid
    scrollable: true
    background: "rgba(0,0,0,0.2)"
    backdrop_blur: "10px"
    cards:
      - type: entities
        entities:
          - light.living_room
  - grid_area: main
    type: grid
    zoom: 0.9
    cards:
      - type: history-graph
        entities:
          - sensor.temperature
```

### Kiosk mode

Set `kiosk: true` on the layout to make the grid fill the viewport as a fixed-position overlay (below the HA header). This is useful for wall-mounted dashboards:

```yaml
layout:
  kiosk: true
  zoom: 0.9
  grid-template-areas: |
    "header header"
    "main   sidebar"
    "footer footer"
  grid-template-columns: 2fr 1fr
  grid-template-rows: auto 1fr auto
```

In kiosk mode the grid is pinned to the viewport edges, respecting the HA sidebar width and header height. In edit mode the top offset automatically adjusts to account for the tab bar.

### Jinja templates in `custom_css`

```yaml
layout:
  custom_css: |
    {% if is_state('binary_sensor.dark_mode', 'on') %}
    :host { --card-background-color: #1a1a1a; }
    {% endif %}
    #root { gap: {{ states('input_number.card_gap') }}px; }
```

Supported expressions:

| Syntax | Example |
|---|---|
| State value | `{{ states('sensor.temperature') }}` |
| Attribute value | `{{ state_attr('climate.living', 'temperature') }}` |
| Conditional block | `{% if is_state('binary_sensor.x', 'on') %}...{% endif %}` |

### Overlays

Overlays are full-screen animated notifications that appear when an entity reaches a given state — useful for alerts, reminders, or ambient feedback on a wall dashboard.

```yaml
layout:
  overlays:
    - entity: binary_sensor.motion_hallway
      state: "on"
      content: "Motion"
      animation: pulse
      duration: "3s"
      color: "#ffffff"
      backdrop_blur: "6px"
```

| Key | Type | Default | Description |
|---|---|---|---|
| `entity` | string | — | Entity whose state is watched |
| `state` | string | `"on"` | State value that triggers the overlay |
| `content` | string | — | Text or emoji displayed; supports `{{ states('...') }}` and `{{ state_attr('...','...') }}` |
| `animation` | string | `"pulse"` | `pulse` · `fade` · `flash` · `slide-up` · `none` |
| `duration` | string | `"3s"` | How long the animation runs (CSS time value) |
| `color` | string | `white` | Text / icon colour (`--sgl-overlay-color`) |
| `background` | string | — | Full CSS background for the overlay layer |
| `backdrop_blur` | string | — | Blur applied behind the overlay e.g. `"6px"` |
| `font_size` | string | `"80px"` | Content font size |
| `text_shadow` | string | — | CSS text-shadow on the content |
| `z_index` | number | `9999` | Stack order |
| `custom_css` | string | — | Extra CSS scoped to this overlay; supports Jinja templates |

**`animation: none`** keeps the overlay visible (static) for as long as the entity stays in the target state, then hides it when the state changes.

#### Content templates

```yaml
- entity: sensor.doorbell
  state: "ringing"
  content: "{{ state_attr('sensor.doorbell', 'caller') }} is at the door"
  animation: flash
```

#### Edit-mode tester

In edit mode a small **Overlays** panel appears in the bottom-right corner with a **Test** button for each overlay, letting you preview the animation without waiting for the real entity to trigger. The panel can be collapsed with the **−** button.

### Tint

Apply a semi-transparent background colour to darken (or colour) the view behind cards. Works on both the root grid and individual sections:

```yaml
layout:
  tint: "#00000020"          # darken the whole view slightly
sections:
  - grid_area: sidebar
    tint: "#20293cdd"        # darker tint on this section
```

### CSS Variables

Define reusable CSS custom properties via `variables`. These are injected on `:host` and available throughout the view:

```yaml
layout:
  variables:
    background-color-2: "#20293cdd"
    card-gap: "8px"
  custom_css: |
    .my-card { background: var(--background-color-2); }
    #root { gap: var(--card-gap); }
```

Variables can also be overridden per-breakpoint inside `mediaquery` (see below).

### Named breakpoints

Define named breakpoints once and reuse them everywhere — in `layout.mediaquery` and per-section `mediaquery`:

```yaml
layout:
  breakpoints:
    mobile: "(max-width: 768px)"
    tablet: "(max-width: 1024px)"
  mediaquery:
    mobile:                          # ← use the name, not the raw query
      grid-template-columns: 1fr
```

Raw query strings still work alongside named breakpoints.

### Responsive layouts

Keys under `mediaquery` are CSS media query strings **or named breakpoints**; values are layout overrides applied when the query matches.

Layout-level `mediaquery` supports: grid properties, `kiosk`, `zoom`, `tint`, `backdrop_blur`, `variables`, and `custom_css`.

```yaml
layout:
  breakpoints:
    mobile: "(max-width: 768px)"
  grid-template-areas: '"left right"'
  grid-template-columns: 1fr 1fr
  tint: "#00000020"
  variables:
    sidebar-bg: "#20293cdd"
  mediaquery:
    mobile:
      grid-template-areas: '"left" "right"'
      grid-template-columns: 1fr
      tint: "#00000040"
      variables:
        sidebar-bg: "#10152080"
      custom_css: |
        .section-sidebar { display: none; }
```

### Per-section media queries

Sections can have their own responsive overrides. Properties are applied with `!important` so they override the base inline styles:

```yaml
layout:
  breakpoints:
    mobile: "(max-width: 768px)"
sections:
  - grid_area: sidebar
    tint: "#20293cdd"
    padding: 16px
    mediaquery:
      mobile:
        tint: "#10152080"
        padding: 4px
        display: none            # hide on mobile
  - grid_area: main
    mediaquery:
      mobile:
        padding: 0px
        custom_css: |
          .section-main hui-section { --column-count: 1; }
```

Supported per-section mediaquery properties: `tint`, `padding`, `background`, `backdrop_blur`, `zoom`, `overflow`, `display`, `variables`, and `custom_css`.

---

## Compatibility with layout-card

Sections Grid Layout and the original [layout-card](https://github.com/thomasloven/lovelace-layout-card) can be loaded at the same time:

- This plugin registers only the `sections-grid-layout` element — it does not touch masonry, horizontal, or vertical layouts
- The view-type dropdown patch only adds the **Sections Grid** option; layout-card's options are untouched
- The patch guard uses a different flag (`_sectionsGridLayoutPatched`) so both scripts can patch `hui-view-editor` independently without conflict

---

## Migrating from lovelace-layout-card-improved

Replace the view type in your YAML:

| Old | New |
|---|---|
| `custom:grid-layout-improved` | `custom:sections-grid-layout` |

---

## License

MIT — Author: [Stormsys](https://github.com/Stormsys)

Grid layout engine derived from [lovelace-layout-card](https://github.com/thomasloven/lovelace-layout-card) by Thomas Lovén (MIT).
