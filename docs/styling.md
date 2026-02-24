# Styling

Background images, tint, blur, and CSS variables.

---

## Background images

Set a fixed background image on the entire view. The image is pinned to the viewport and does not scroll with the page content.

```yaml
layout:
  background_image: "/local/images/wallpaper.jpg"
  background_blur: "8px"
  background_opacity: 0.6
  tint: "#00000040"
```

| Key | Type | Default | Description |
|---|---|---|---|
| `background_image` | string | -- | Image URL or Jinja template |
| `background_blur` | string | `"0px"` | Blur applied to the background image element |
| `background_opacity` | number | `1` | Opacity of the background image element |

### Template-evaluated backgrounds

The `background_image` value can contain [Jinja templates](templates.md). The image updates reactively when the referenced entity changes:

```yaml
layout:
  background_image: "{{ state_attr('media_player.living_room', 'entity_picture') }}"
  background_blur: "20px"
  background_opacity: 0.4
```

This is useful for showing album art, camera snapshots, or any entity attribute that returns an image URL.

---

## Tint and backdrop blur

`tint` and `backdrop_blur` can be applied at both the layout level (on `#root`) and per-section (on `.section-container`).

```yaml
layout:
  tint: "#00000020"            # darken the whole view slightly
  backdrop_blur: "6px"         # blur content behind the grid
sections:
  - grid_area: sidebar
    tint: "#20293cdd"          # darker tint on this section
    backdrop_blur: "10px"      # blur content behind this section
```

Both properties are also supported in [responsive `mediaquery` blocks](responsive.md) at either level.

---

## CSS variables

Define reusable CSS custom properties via `variables`. These are set on `:host` (layout level) or on the `.section-container` (section level) and cascade into all child elements.

### Layout-level variables

Available throughout the entire view -- in `custom_css`, in cards, everywhere:

```yaml
layout:
  variables:
    sidebar-bg: "#20293cdd"
    card-gap: "8px"
  custom_css: |
    .my-card { background: var(--sidebar-bg); }
    #root { gap: var(--card-gap); }
```

### Per-section variables

Scoped to a single section's container. This replaces the need for `card_mod` to override HA theme variables on individual sections:

```yaml
sections:
  - grid_area: header
    type: grid
    zoom: 0.85
    variables:
      background-color-2: none
      secondary-background-color: none
      primary-background-color: none
    cards:
      - type: weather-forecast
        entity: weather.home
```

The variables are set as inline CSS custom properties on the `.section-container` div, so they cascade into all cards within that section -- no `card_mod` needed.

### Variables in media queries

Variables can be overridden per-breakpoint at both levels:

```yaml
layout:
  variables:
    sidebar-bg: "#20293cdd"
  mediaquery:
    "(max-width: 768px)":
      variables:
        sidebar-bg: "#10152080"
sections:
  - grid_area: sidebar
    variables:
      card-padding: "16px"
    mediaquery:
      "(max-width: 768px)":
        variables:
          card-padding: "4px"
```

See the [responsive docs](responsive.md) for the full media query reference.
