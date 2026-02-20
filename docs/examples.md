# Examples & Advanced Features

---

## Kiosk mode

Set `kiosk: true` on the layout to make the grid fill the viewport as a fixed-position overlay (below the HA header). Ideal for wall-mounted dashboards.

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

All sections automatically become scrollable in kiosk mode. You can disable kiosk on smaller screens via a [mediaquery](responsive.md):

```yaml
layout:
  kiosk: true
  mediaquery:
    "(max-width: 768px)":
      kiosk: false
```

---

## Section YAML editor

In edit mode, each section shows a label badge in the bottom-right corner with the grid area name. Click the label to open a YAML editor dialog where you can edit all section properties (except `cards`, which are managed by the normal card editor).

The editor uses Home Assistant's built-in `ha-yaml-editor` when available, falling back to `ha-code-editor` or a plain textarea.

Properties you can set in the editor:

```yaml
grid_area: sidebar
type: grid
title: My Sidebar
scrollable: true
background: "rgba(0,0,0,0.2)"
backdrop_blur: "10px"
tint: "#20293cdd"
zoom: 0.9
padding: "8px"
overflow: hidden
variables:
  primary-background-color: none
mediaquery:
  "(max-width: 768px)":
    display: none
```

---

## Complete example

A wall-dashboard layout combining kiosk mode, responsive breakpoints, template-evaluated backgrounds, overlays, and per-section styling:

```yaml
title: Dashboard
type: custom:sections-grid-layout
layout:
  kiosk: true
  zoom: 0.95
  grid-template-areas: |
    "header  header  header"
    "left    main    right"
    "footer  footer  footer"
  grid-template-columns: 250px 1fr 300px
  grid-template-rows: auto 1fr auto
  background_image: "{{ state_attr('media_player.living_room', 'entity_picture') }}"
  background_blur: "20px"
  background_opacity: 0.3
  tint: "#00000060"
  variables:
    card-bg: "rgba(30, 40, 60, 0.8)"
  breakpoints:
    mobile: "(max-width: 768px)"
    tablet: "(max-width: 1200px)"
  mediaquery:
    mobile:
      kiosk: false
      grid-template-areas: |
        "header"
        "main"
        "footer"
      grid-template-columns: 1fr
      grid-template-rows: auto
      backdrop_blur: "0px"
      variables:
        card-bg: "var(--card-background-color)"
    tablet:
      grid-template-areas: |
        "header header"
        "main   right"
        "footer footer"
      grid-template-columns: 1fr 280px
  custom_css: |
    {% if is_state('binary_sensor.dark_mode', 'on') %}
    :host { --card-background-color: var(--card-bg); }
    {% endif %}
  overlays:
    - entity: binary_sensor.doorbell
      state: "on"
      content: "Doorbell"
      animation: pulse
      duration: "4s"
      backdrop_blur: "8px"
sections:
  - grid_area: header
    type: grid
    zoom: 0.85
    padding: "4px 8px"
    variables:
      primary-background-color: none
      secondary-background-color: none
    cards:
      - type: weather-forecast
        entity: weather.home
  - grid_area: left
    type: grid
    scrollable: true
    tint: "#20293cdd"
    backdrop_blur: "10px"
    mediaquery:
      mobile:
        display: none
    cards:
      - type: entities
        entities:
          - light.living_room
  - grid_area: main
    type: grid
    scrollable: true
    mediaquery:
      mobile:
        padding: 0px
        custom_css: |
          .section-main hui-section { --column-count: 1; }
    cards:
      - type: history-graph
        entities:
          - sensor.temperature
  - grid_area: right
    type: grid
    scrollable: true
    background: "rgba(0,0,0,0.15)"
    mediaquery:
      tablet:
        backdrop_blur: "6px"
      mobile:
        display: none
    cards:
      - type: entities
        entities:
          - binary_sensor.front_door
  - grid_area: footer
    type: grid
    padding: "4px"
    variables:
      primary-background-color: transparent
    cards:
      - type: markdown
        content: "Dashboard v1.0"
```
