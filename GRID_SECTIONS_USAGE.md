# Grid Layout Sections & Custom CSS Usage Guide

## Layout Card Improved

This is an enhanced version of the original layout-card that can run alongside the stock version. All card types use the `-improved` suffix to avoid conflicts.

**Card Types Available:**
- `layout-card-improved` - Main layout card
- `grid-layout-improved` - Grid layout view
- `masonry-layout-improved` - Masonry layout view
- `horizontal-layout-improved` - Horizontal layout view
- `vertical-layout-improved` - Vertical layout view
- `gap-card-improved` - Gap spacing card
- `layout-break-improved` - Layout break card

## Overview

This document describes the new features added to the grid layout:

1. **Section-based Grid Layout**: Automatically visible sections in all grid spots during edit mode
2. **Custom CSS Injection**: Direct CSS injection into the layout/view layer

## Feature 1: Section-based Grid Layout

### What's New?

In edit mode, grid layouts now support a section-based approach where each grid area becomes a visible section container. This makes it easier to visualize and organize your dashboard layout, similar to the native Home Assistant sections dashboard.

### How to Use

#### Option A: Explicit Sections Definition

Define sections explicitly in your layout configuration:

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-columns: 1fr 1fr 1fr
  grid-template-rows: auto auto
  grid-template-areas: |
    "header header header"
    "sidebar main main"
    "footer footer footer"
  sections:
    header:
      grid_area: header
    sidebar:
      grid_area: sidebar
    main:
      grid_area: main
    footer:
      grid_area: footer
cards:
  - type: markdown
    content: "Header Content"
    view_layout:
      grid_area: header
  - type: entities
    entities:
      - light.living_room
    view_layout:
      grid_area: sidebar
  - type: weather-forecast
    entity: weather.home
    view_layout:
      grid_area: main
```

#### Option B: Auto-detection from grid-template-areas

If you have `grid-template-areas` defined, sections will be auto-detected in edit mode:

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-columns: 200px 1fr
  grid-template-rows: auto 1fr auto
  grid-template-areas: |
    "header header"
    "sidebar content"
    "footer footer"
cards:
  - type: markdown
    content: "My Dashboard"
    view_layout:
      grid_area: header
  # ... more cards
```

### Section Behavior

**In Edit Mode:**
- Each section is displayed with a visible border
- Section name appears in a header bar
- Empty sections show a "Drop cards here" placeholder
- Sections have a hover effect for better visibility
- All grid spots are visible, making it easy to see your layout structure

**In Normal Mode:**
- Sections render without extra styling
- Clean presentation focused on content
- No borders or headers visible

### Visual Features

- **Section Headers**: Blue header bars showing the section name
- **Dashed Borders**: Clear boundaries for each section
- **Hover Effects**: Sections highlight when you hover over them
- **Empty Placeholders**: Visual indicators for sections without cards
- **Flexible Layout**: Sections adapt to your grid configuration

## Feature 2: Custom CSS Injection

### What's New?

You can now inject custom CSS directly into the grid layout, giving you complete control over styling.

### How to Use

Add a `custom_css` property to your layout configuration:

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-columns: repeat(3, 1fr)
  grid-gap: 16px
  custom_css: |
    #root {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 20px;
    }
    .grid-section {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    ha-card {
      border-radius: 8px;
      overflow: hidden;
    }
cards:
  # ... your cards
```

### CSS Injection Capabilities

The `custom_css` property allows you to:

1. **Style the Container**: Customize the `#root` element
2. **Style Sections**: Target `.grid-section` class
3. **Style Cards**: Use standard CSS selectors
4. **Use CSS Variables**: Access Home Assistant theme variables
5. **Add Animations**: Create custom animations and transitions
6. **Responsive Design**: Use media queries within your custom CSS

### Advanced CSS Examples

#### Custom Card Spacing
```yaml
custom_css: |
  #root > * {
    margin: 8px;
  }
```

#### Dark Mode Customization
```yaml
custom_css: |
  #root {
    background: #1a1a1a;
  }
  .grid-section.edit-mode {
    border-color: #4a4a4a;
    background: #2a2a2a;
  }
```

#### Section-specific Styling
```yaml
custom_css: |
  .grid-section[data-section="header"] {
    background: var(--primary-color);
  }
  .grid-section[data-section="sidebar"] {
    border-left: 4px solid var(--accent-color);
  }
```

#### Animations
```yaml
custom_css: |
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  #root > * {
    animation: fadeIn 0.5s ease-out;
  }
```

## Complete Example

Here's a complete example combining both features:

```yaml
title: My Advanced Dashboard
type: custom:grid-layout
layout:
  grid-template-columns: 300px 1fr 300px
  grid-template-rows: 80px 1fr 60px
  grid-gap: 12px
  grid-template-areas: |
    "header header header"
    "left-sidebar main right-sidebar"
    "footer footer footer"
  custom_css: |
    #root {
      padding: 16px;
      background: var(--lovelace-background, #f5f5f5);
    }
    .grid-section.edit-mode {
      border-color: var(--primary-color);
      border-width: 3px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .section-header {
      background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
      font-size: 16px;
    }
  sections:
    header:
      grid_area: header
    left-sidebar:
      grid_area: left-sidebar
    main:
      grid_area: main
    right-sidebar:
      grid_area: right-sidebar
    footer:
      grid_area: footer
cards:
  - type: markdown
    content: "# Dashboard Header"
    view_layout:
      grid_area: header
  - type: entities
    title: "Controls"
    entities:
      - light.living_room
      - switch.fan
    view_layout:
      grid_area: left-sidebar
  - type: weather-forecast
    entity: weather.home
    view_layout:
      grid_area: main
  - type: entities
    title: "Info"
    entities:
      - sensor.temperature
      - sensor.humidity
    view_layout:
      grid_area: right-sidebar
  - type: horizontal-stack
    cards:
      - type: button
        entity: light.all_lights
    view_layout:
      grid_area: footer
```

## Tips & Best Practices

1. **Start Simple**: Begin with auto-detection, then add explicit sections if needed
2. **Use Meaningful Names**: Name your sections descriptively (header, sidebar, etc.)
3. **Test in Edit Mode**: Always check your layout in edit mode to see the structure
4. **Combine with Media Queries**: Use the existing `mediaquery` feature for responsive layouts
5. **CSS Variables**: Leverage Home Assistant's CSS variables for consistent theming
6. **Incremental CSS**: Add custom CSS gradually and test as you go

## Browser Compatibility

These features use modern CSS Grid and Web Components APIs. They are compatible with:
- Chrome/Edge 88+
- Firefox 86+
- Safari 14+

## Troubleshooting

### Sections not appearing in edit mode
- Verify your `grid-template-areas` syntax
- Check that section names match between areas and cards
- Ensure you're in edit mode

### Custom CSS not applying
- Verify YAML syntax (use `|` for multiline CSS)
- Check browser console for CSS errors
- Ensure selectors are specific enough

### Cards not appearing in sections
- Check that `view_layout.grid_area` matches section names
- Verify cards are not hidden by conditional logic
- Ensure grid areas are large enough to display content

## Summary

These enhancements make the grid layout more intuitive and customizable:
- **Visual Sections**: See your grid structure clearly in edit mode
- **Flexible Styling**: Complete CSS control for advanced customization
- **Better Organization**: Organize cards by section for easier management
- **Improved UX**: Edit mode now shows all grid spots for easier layout design
