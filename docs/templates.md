# Jinja Templates

Use Jinja-like expressions inside `custom_css` and `background_image` to make your layout respond to entity state in real-time.

---

## Supported expressions

| Syntax | Example |
|---|---|
| State value | `{{ states('sensor.temperature') }}` |
| Attribute value | `{{ state_attr('climate.living', 'temperature') }}` |
| Conditional block | `{% if is_state('binary_sensor.x', 'on') %}...{% endif %}` |
| Negative conditional | `{% if not is_state('binary_sensor.x', 'on') %}...{% endif %}` |

Templates are re-evaluated **reactively** whenever a referenced entity's state changes.

---

## Example: dynamic CSS

```yaml
layout:
  custom_css: |
    {% if is_state('binary_sensor.dark_mode', 'on') %}
    :host { --card-background-color: #1a1a1a; }
    {% endif %}
    #root { gap: {{ states('input_number.card_gap') }}px; }
```

---

## Example: dynamic background

```yaml
layout:
  background_image: "{{ state_attr('media_player.living_room', 'entity_picture') }}"
  background_blur: "20px"
  background_opacity: 0.4
```

See the [styling docs](styling.md#template-evaluated-backgrounds) for more on template-evaluated backgrounds.
