# Responsive Layouts

Named breakpoints and media query overrides at both layout and section level.

---

## Named breakpoints

Define named breakpoints once and reuse them everywhere -- in `layout.mediaquery` and per-section `mediaquery`:

```yaml
layout:
  breakpoints:
    mobile: "(max-width: 768px)"
    tablet: "(max-width: 1024px)"
  mediaquery:
    mobile:                          # use the name, not the raw query
      grid-template-columns: 1fr
```

Raw query strings still work alongside named breakpoints.

---

## Layout-level `mediaquery`

Keys under `mediaquery` are CSS media query strings **or named breakpoints**; values are layout overrides applied when the query matches.

Supported properties:

| Property | Description |
|---|---|
| `grid-*`, `place-*` | All CSS grid properties |
| `kiosk` | `false` to disable kiosk mode at this breakpoint |
| `zoom` | Override grid zoom |
| `tint` | Override grid tint |
| `backdrop_blur` | Override grid backdrop blur |
| `variables` | Override or add CSS custom properties |
| `custom_css` | Additional CSS (supports [Jinja templates](templates.md)) |

```yaml
layout:
  breakpoints:
    mobile: "(max-width: 768px)"
  grid-template-areas: '"left right"'
  grid-template-columns: 1fr 1fr
  tint: "#00000020"
  backdrop_blur: "6px"
  variables:
    sidebar-bg: "#20293cdd"
  mediaquery:
    mobile:
      grid-template-areas: '"left" "right"'
      grid-template-columns: 1fr
      tint: "#00000040"
      backdrop_blur: "0px"
      variables:
        sidebar-bg: "#10152080"
      custom_css: |
        .section-sidebar { display: none; }
```

---

## Per-section `mediaquery`

Sections can have their own responsive overrides. Properties are applied with `!important` so they override the base inline styles.

Supported properties:

| Property | Description |
|---|---|
| `tint` | Override section tint |
| `padding` | Override section padding |
| `background` | Override section background |
| `backdrop_blur` | Override section backdrop blur |
| `zoom` | Override section zoom |
| `overflow` | Override section overflow |
| `display` | Set to `none` to hide a section |
| `variables` | Override or add section-scoped CSS custom properties |
| `custom_css` | Additional CSS (supports [Jinja templates](templates.md)) |

```yaml
layout:
  breakpoints:
    mobile: "(max-width: 768px)"
sections:
  - grid_area: sidebar
    tint: "#20293cdd"
    padding: 16px
    backdrop_blur: "10px"
    variables:
      card-padding: "16px"
    mediaquery:
      mobile:
        tint: "#10152080"
        padding: 4px
        backdrop_blur: "0px"
        display: none
        variables:
          card-padding: "4px"
  - grid_area: main
    mediaquery:
      mobile:
        padding: 0px
        custom_css: |
          .section-main hui-section { --column-count: 1; }
```
