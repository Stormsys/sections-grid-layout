# Configuration Reference

Full reference for all layout and per-section options.

---

## Layout options

These properties go under the `layout:` key in your view config.

| Key | Type | Description |
|---|---|---|
| `grid-template-areas` | string | CSS grid-template-areas value |
| `grid-template-columns` | string | CSS grid-template-columns value |
| `grid-template-rows` | string | CSS grid-template-rows value |
| `place-items` | string | CSS place-items value (align + justify items) |
| `place-content` | string | CSS place-content value (align + justify content) |
| `height` | string | Explicit height for the grid (also enables `overflow-y: auto`) |
| `custom_css` | string | Extra CSS injected into the view; supports [Jinja templates](templates.md) |
| `background_image` | string | Background image URL or Jinja template ([details](styling.md#background-images)) |
| `background_blur` | string | Blur applied to the background image e.g. `"8px"` (default `"0px"`) |
| `background_opacity` | number | 0-1 opacity for the background image (default `1`) |
| `tint` | string | Semi-transparent background colour on the grid (e.g. `"#00000020"`) |
| `backdrop_blur` | string | CSS blur applied to the grid via `backdrop-filter` e.g. `"10px"` |
| `variables` | object | CSS custom properties injected on `:host` ([details](styling.md#css-variables)) |
| `breakpoints` | object | Named media queries for reuse ([details](responsive.md#named-breakpoints)) |
| `mediaquery` | object | Responsive overrides ([details](responsive.md)) |
| `margin` | string | Outer margin of the grid (default `"0px 4px 0px 4px"`) |
| `padding` | string | Inner padding of the grid (default `"4px 0px 4px 0px"`) |
| `kiosk` | boolean | Fixed-position layout filling the viewport below the header ([details](examples.md#kiosk-mode)) |
| `zoom` | number/string | CSS zoom applied to the entire grid (e.g. `0.9`) |
| `overlays` | list | Full-screen animated notifications triggered by entity state ([details](overlays.md)) |

Any CSS grid property (keys starting with `grid` or `place-`) is passed through directly to the grid container.

---

## Per-section options

Each section can have these properties alongside `grid_area`, `type`, and `cards`:

| Key | Type | Description |
|---|---|---|
| `scrollable` | boolean | Makes the section scrollable with hidden scrollbars |
| `background` | string | CSS background value (colour, gradient, image) |
| `backdrop_blur` | string | CSS blur value applied as `backdrop-filter` e.g. `"10px"` |
| `zoom` | number/string | CSS zoom applied to this section (e.g. `0.85`) |
| `overflow` | string | CSS overflow value (`hidden`, `auto`, `scroll`, etc.) |
| `padding` | string | Section padding (default `10px` via `--section-padding`) |
| `tint` | string | Semi-transparent background colour (e.g. `"#20293cdd"`) |
| `variables` | object | CSS custom properties scoped to this section ([details](styling.md#per-section-variables)) |
| `mediaquery` | object | Per-section responsive overrides ([details](responsive.md#per-section-mediaquery)) |

```yaml
sections:
  - grid_area: sidebar
    type: grid
    scrollable: true
    background: "rgba(0,0,0,0.2)"
    backdrop_blur: "10px"
    tint: "#20293cdd"
    zoom: 0.9
    variables:
      primary-background-color: none
      secondary-background-color: none
    cards:
      - type: entities
        entities:
          - light.living_room
  - grid_area: header
    type: grid
    padding: "4px 8px"
    overflow: hidden
    variables:
      background-color-2: none
    cards:
      - type: weather-forecast
        entity: weather.home
```
