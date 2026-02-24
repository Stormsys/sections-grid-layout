# Overlays

Full-screen animated notifications that appear when an entity reaches a given state -- useful for alerts, reminders, or ambient feedback on a wall dashboard.

---

## Basic usage

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

---

## Options

| Key | Type | Default | Description |
|---|---|---|---|
| `entity` | string | -- | Entity whose state is watched |
| `state` | string | `"on"` | State value that triggers the overlay |
| `content` | string | -- | Text or emoji displayed; supports `{{ states('...') }}` and `{{ state_attr('...','...') }}` |
| `animation` | string | `"pulse"` | `pulse` / `fade` / `flash` / `slide-up` / `none` |
| `duration` | string | `"3s"` | How long the animation runs (CSS time value) |
| `color` | string | `white` | Text / icon colour (`--sgl-overlay-color`) |
| `background` | string | -- | Full CSS background for the overlay layer |
| `backdrop_blur` | string | -- | Blur applied behind the overlay e.g. `"6px"` |
| `font_size` | string | `"80px"` | Content font size |
| `text_shadow` | string | -- | CSS text-shadow on the content |
| `z_index` | number | `9999` | Stack order |
| `custom_css` | string | -- | Extra CSS scoped to this overlay; supports [Jinja templates](templates.md) |

---

## Animations

- **`pulse`** -- scales and fades the content in a loop
- **`fade`** -- fades in and out
- **`flash`** -- rapid on/off blinking
- **`slide-up`** -- slides content up from the bottom
- **`none`** -- keeps the overlay visible (static) for as long as the entity stays in the target state, then hides it when the state changes

---

## Content templates

The `content` field supports [Jinja templates](templates.md):

```yaml
- entity: sensor.doorbell
  state: "ringing"
  content: "{{ state_attr('sensor.doorbell', 'caller') }} is at the door"
  animation: flash
```

---

## Edit-mode tester

In edit mode a small **Overlays** panel appears in the bottom-right corner with a **Test** button for each overlay, letting you preview the animation without waiting for the real entity to trigger. The panel can be collapsed with the **-** button.
