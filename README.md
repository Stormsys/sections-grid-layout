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
| `mediaquery` | object | Responsive overrides (see below) |
| `margin` | string | Outer margin of the grid |
| `padding` | string | Inner padding of the grid |
| `kiosk` | boolean | Fixed-position layout filling the viewport below the header |
| `zoom` | number/string | CSS zoom applied to the entire grid (e.g. `0.9`) |

### Per-section options

Each section can have these additional properties alongside `grid_area`, `type`, and `cards`:

| Key | Type | Description |
|---|---|---|
| `scrollable` | boolean | Makes the section scrollable with hidden scrollbars |
| `background` | string | CSS background value (color, gradient, image) |
| `backdrop_blur` | string | CSS blur value applied as `backdrop-filter` e.g. `"10px"` |
| `zoom` | number/string | CSS zoom applied to this section (e.g. `0.85`) |
| `overflow` | string | CSS overflow value (`hidden`, `auto`, `scroll`, etc.) |

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

### Responsive layouts

Keys under `mediaquery` are CSS media query strings; values are layout overrides applied when the query matches:

```yaml
layout:
  grid-template-areas: '"left right"'
  grid-template-columns: 1fr 1fr
  mediaquery:
    "(max-width: 600px)":
      grid-template-areas: '"left" "right"'
      grid-template-columns: 1fr
```

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
