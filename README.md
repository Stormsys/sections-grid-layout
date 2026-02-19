# Sections Grid Layout

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
| `mediaquery` | list | Responsive overrides (see below) |
| `margin` | string | Outer margin of the grid |
| `padding` | string | Inner padding of the grid |

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

```yaml
layout:
  grid-template-areas: '"left right"'
  grid-template-columns: 1fr 1fr
  mediaquery:
    - query: "(max-width: 600px)"
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

## Helper cards

### `gap-card-sgl`

Inserts a blank spacer of a given height.

```yaml
type: custom:gap-card-sgl
height: 40   # px, default 50
```

### `layout-break-sgl`

Forces a column break in column-based child layouts.

```yaml
type: custom:layout-break-sgl
```

---

## Migrating from lovelace-layout-card-improved

Replace element names in your YAML:

| Old | New |
|---|---|
| `custom:grid-layout-improved` | `custom:sections-grid-layout` |
| `custom:gap-card-improved` | `custom:gap-card-sgl` |
| `custom:layout-break-improved` | `custom:layout-break-sgl` |

---

## License

MIT — Author: [Stormsys](https://github.com/Stormsys)

Grid layout engine derived from [lovelace-layout-card](https://github.com/thomasloven/lovelace-layout-card) by Thomas Lovén (MIT).
