# Sections Grid Layout

> **Alpha** — this is pre-release software. APIs, element names, and YAML keys may change before v1.0. Test on a non-production HA instance.

A Home Assistant Lovelace **view** plugin that places native HA sections into a full CSS Grid -- giving you precise control over layout, styling, and responsiveness while keeping all standard section features intact.

Requires **Home Assistant 2024.2+**.

---

## Why use this?

HA's built-in Sections view arranges sections in a simple responsive column grid. Sections Grid Layout replaces that with a real CSS Grid, so you can:

- **Name your areas** -- define `grid-template-areas` and assign each section to a named grid area
- **Size precisely** -- control columns and rows with `grid-template-columns` / `grid-template-rows`
- **Style sections individually** -- backgrounds, tints, blur, zoom, padding, overflow, and scoped CSS variables per section
- **Go responsive** -- define named breakpoints once, apply overrides at layout and section level
- **Use templates** -- write `{{ states('...') }}` and `{% if %}` expressions in `custom_css` and `background_image` so the layout reacts to entity state
- **Set backgrounds** -- full-view background images with blur, opacity, and template support
- **Add overlays** -- full-screen animated alerts triggered by entity state
- **Run kiosk mode** -- fixed-position layout for wall-mounted dashboards

Card dragging, the + button, and the section title editor all work exactly as they do in the native Sections view.

---

## Installation (HACS)

1. Add this repository as a custom HACS repository (type: **Lovelace**)
2. Install **Sections Grid Layout** from HACS
3. Add the resource in Settings → Dashboards → Resources:
   ```
   /hacsfiles/sections-grid-layout/sections-grid-layout.js
   ```

---

## Quick start

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

That's it -- three columns, named areas, standard HA cards. From here you can layer on styling, responsive breakpoints, templates, and more.

---

## Documentation

| Guide | What's covered |
|---|---|
| [Configuration Reference](docs/configuration.md) | All layout and per-section options |
| [Styling](docs/styling.md) | Background images, tint, blur, CSS variables |
| [Responsive Layouts](docs/responsive.md) | Named breakpoints and media query overrides |
| [Jinja Templates](docs/templates.md) | Dynamic CSS and backgrounds from entity state |
| [Overlays](docs/overlays.md) | Full-screen animated notifications |
| [Examples & Advanced](docs/examples.md) | Kiosk mode, section YAML editor, complete wall-dashboard example |
| [Compatibility](docs/compatibility.md) | layout-card coexistence and migration |

---

## License

MIT -- Author: [Stormsys](https://github.com/Stormsys)

Grid layout engine derived from [lovelace-layout-card](https://github.com/thomasloven/lovelace-layout-card) by Thomas Loven (MIT).
