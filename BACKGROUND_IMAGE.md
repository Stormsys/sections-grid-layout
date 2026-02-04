# Background Image Support

## Overview

Grid Layout Improved now supports background images with blur and opacity controls. The background image supports Jinja templates for dynamic backgrounds!

## Basic Usage

```yaml
type: custom:grid-layout-improved
layout:
  background_image: /local/backgrounds/my-background.jpg
  background_blur: 10px
  background_opacity: 0.5
  grid-template-areas: |
    "sidebar main"
sections:
  - type: grid
    title: Main
    grid_area: main
    cards: [...]
```

## Parameters

### `background_image` (string)
The URL or path to your background image. Supports:
- Local files: `/local/backgrounds/image.jpg`
- External URLs: `https://example.com/image.jpg`
- **Jinja templates**: `{{ state_attr('weather.home', 'entity_picture') }}`

### `background_blur` (string, optional)
CSS blur value applied to the background image.
- Default: `0px` (no blur)
- Examples: `5px`, `10px`, `20px`
- Larger values = more blur

### `background_opacity` (number, optional)
Opacity of the background image.
- Default: `1` (fully opaque)
- Range: `0` (transparent) to `1` (opaque)
- Examples: `0.5`, `0.7`, `0.3`

## Examples

### Simple Background
```yaml
layout:
  background_image: /local/backgrounds/home.jpg
```

### Blurred Background
```yaml
layout:
  background_image: /local/backgrounds/home.jpg
  background_blur: 15px
  background_opacity: 0.8
```

### Dynamic Background with Jinja

**Important**: Use proper YAML multiline syntax for templates!

```yaml
layout:
  # Use state value for background
  background_image: "{{ states('input_text.current_background_image') }}"
  background_blur: 15px
  background_opacity: 0.6
```

Or with multiline template:
```yaml
layout:
  # Use weather condition for background
  background_image: >-
    {{ '/local/backgrounds/' + states('weather.home') + '.jpg' }}
  background_blur: 8px
  background_opacity: 0.6
```

### Time-Based Background
```yaml
layout:
  background_image: >-
    {% if now().hour < 6 %}
      /local/backgrounds/night.jpg
    {% elif now().hour < 12 %}
      /local/backgrounds/morning.jpg
    {% elif now().hour < 18 %}
      /local/backgrounds/afternoon.jpg
    {% else %}
      /local/backgrounds/evening.jpg
    {% endif %}
  background_blur: 10px
  background_opacity: 0.7
```

### Season-Based Background
```yaml
layout:
  background_image: >-
    {% set month = now().month %}
    {% if month in [12, 1, 2] %}
      /local/backgrounds/winter.jpg
    {% elif month in [3, 4, 5] %}
      /local/backgrounds/spring.jpg
    {% elif month in [6, 7, 8] %}
      /local/backgrounds/summer.jpg
    {% else %}
      /local/backgrounds/fall.jpg
    {% endif %}
  background_blur: 12px
```

## Complete Example with Custom CSS

```yaml
type: custom:grid-layout-improved
title: My Dashboard
layout:
  grid-template-columns: 300px 1fr
  grid-template-areas: |
    "sidebar main"
  
  # Background image
  background_image: /local/backgrounds/home-blur.jpg
  background_blur: 15px
  background_opacity: 0.6
  
  # Custom CSS to complement the background
  custom_css: |
    /* Make sections semi-transparent to show background */
    .section-container {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    
    /* Glassmorphism effect in edit mode */
    #root.edit-mode .section-container {
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    /* Section labels blend with background */
    .section-grid-label {
      background: rgba(3, 169, 244, 0.9);
      backdrop-filter: blur(10px);
    }

sections:
  - type: grid
    title: Sidebar
    grid_area: sidebar
    cards:
      - type: entities
        entities: [light.living_room]
  
  - type: grid
    title: Main
    grid_area: main
    cards:
      - type: weather-forecast
        entity: weather.home
```

## How It Works

The background image is rendered as a fixed-position element:
- Positioned behind all content (`z-index: -1`)
- Fixed to viewport (doesn't scroll)
- Covers entire view
- Centered and sized to cover
- Blur applied via CSS filter
- Opacity controlled via CSS opacity

## Tips & Best Practices

### 1. Blur for Readability
Use blur to make text more readable:
```yaml
background_blur: 10px  # Sweet spot for most images
background_opacity: 0.7
```

### 2. Adjust Section Transparency
Make sections semi-transparent to show background:
```yaml
custom_css: |
  .section-container {
    background: rgba(255, 255, 255, 0.85);
  }
```

### 3. Optimize Image Size
- Use compressed images (WebP format recommended)
- Recommended size: 1920x1080 or smaller
- Keep file size under 500KB for performance

### 4. Test Different Opacities
- `0.3-0.5` - Subtle background
- `0.6-0.7` - Balanced visibility
- `0.8-0.9` - Prominent background

### 5. Combine with Glassmorphism
```yaml
custom_css: |
  .section-container {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
```

## Advanced Examples

### Weather-Based Background
```yaml
layout:
  background_image: >-
    {% set condition = states('weather.home') %}
    {% if condition == 'sunny' %}
      /local/backgrounds/sunny.jpg
    {% elif condition == 'cloudy' %}
      /local/backgrounds/cloudy.jpg
    {% elif condition == 'rainy' %}
      /local/backgrounds/rainy.jpg
    {% elif condition == 'snowy' %}
      /local/backgrounds/snowy.jpg
    {% else %}
      /local/backgrounds/default.jpg
    {% endif %}
  background_blur: 8px
  background_opacity: 0.6
```

### Presence-Based Background
```yaml
layout:
  background_image: >-
    {% if is_state('person.john', 'home') %}
      /local/backgrounds/home.jpg
    {% else %}
      /local/backgrounds/away.jpg
    {% endif %}
  background_blur: 10px
```

### Room-Specific Backgrounds
```yaml
layout:
  background_image: >-
    {{ '/local/backgrounds/' + states('input_select.active_room') + '.jpg' }}
  background_blur: 12px
  background_opacity: 0.7
```

## Troubleshooting

### Background not showing
- Check image path is correct
- Verify file exists in `/config/www/backgrounds/`
- Use browser dev tools to inspect the `.background` element
- Check for CORS issues with external URLs

### Jinja template not updating
- Templates are evaluated when the view is loaded
- Reload the dashboard to see changes
- Check template syntax in Developer Tools → Template

### Performance issues
- Reduce image file size
- Use smaller resolution images
- Consider using CSS gradients instead for simple backgrounds

### Background too prominent
- Increase `background_blur`
- Decrease `background_opacity`
- Adjust section transparency in custom_css

## CSS Variables Alternative

You can also use CSS variables in custom_css:
```yaml
layout:
  custom_css: |
    .background {
      background: url('/local/backgrounds/home.jpg');
      filter: blur(10px);
      opacity: 0.5;
    }
```

But using the dedicated parameters is cleaner and easier!

## Summary

Background image support adds:
- ✅ Static background images
- ✅ Dynamic backgrounds via Jinja templates
- ✅ Blur control for aesthetics
- ✅ Opacity control for readability
- ✅ Fixed positioning (doesn't scroll)
- ✅ Automatic sizing and centering

Create beautiful, dynamic dashboards that change based on weather, time, presence, or any Home Assistant state! 🎨
