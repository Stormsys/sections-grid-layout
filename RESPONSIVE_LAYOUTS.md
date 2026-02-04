# Responsive Layouts Guide

## Overview

Grid Layout Improved supports responsive layouts in two ways:
1. **Built-in `mediaquery`** - For changing grid properties based on screen size
2. **CSS Media Queries** - In `custom_css` for detailed styling

## Method 1: Built-in mediaquery (Grid Properties)

Use the `mediaquery` property to change grid layout based on screen size:

```yaml
type: custom:grid-layout-improved
layout:
  # Desktop layout (default)
  grid-template-columns: 300px 1fr 300px
  grid-template-rows: 100px 1fr 80px
  grid-gap: 16px
  grid-template-areas: |
    "header header header"
    "left main right"
    "footer footer footer"
  
  # Responsive breakpoints
  mediaquery:
    "(max-width: 1024px)":
      # Tablet layout
      grid-template-columns: 250px 1fr
      grid-template-areas: |
        "header header"
        "left main"
        "footer footer"
    
    "(max-width: 768px)":
      # Mobile layout
      grid-template-columns: 1fr
      grid-template-areas: |
        "header"
        "main"
        "left"
        "footer"
    
    "(max-width: 480px)":
      # Small mobile
      grid-template-columns: 1fr
      grid-gap: 8px
      grid-template-areas: |
        "header"
        "main"
        "footer"
  
  background_image: /local/bg.jpg
  background_blur: 10px

sections:
  - type: grid
    title: Header
    grid_area: header
    cards: [...]
  
  - type: grid
    title: Sidebar
    grid_area: left
    cards: [...]
  
  - type: grid
    title: Main
    grid_area: main
    cards: [...]
  
  - type: grid
    title: Right Panel
    grid_area: right
    cards: [...]
  
  - type: grid
    title: Footer
    grid_area: footer
    cards: [...]
```

### How mediaquery Works

- **First match wins** - Only the first matching media query is applied
- **Grid properties only** - Affects grid-template-*, grid-gap, etc.
- **Auto-updates** - Changes when screen is resized
- **Order matters** - Put more specific rules first

### Supported Grid Properties

You can change any grid property:
- `grid-template-columns`
- `grid-template-rows`
- `grid-template-areas`
- `grid-gap` / `gap`
- `grid-auto-flow`
- `grid-auto-columns`
- `grid-auto-rows`
- `place-items`
- `place-content`

## Method 2: CSS Media Queries (Full Styling Control)

Use `custom_css` with standard CSS media queries for complete control:

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-columns: 300px 1fr 300px
  grid-template-areas: |
    "header header header"
    "sidebar main right"
  
  custom_css: |
    /* Desktop styles */
    #root {
      padding: 20px;
      gap: 16px;
    }
    
    .section-container {
      border-radius: 12px;
    }
    
    /* Tablet */
    @media (max-width: 1024px) {
      #root {
        padding: 16px;
        gap: 12px;
      }
      
      .section-grid-label {
        font-size: 10px;
      }
    }
    
    /* Mobile */
    @media (max-width: 768px) {
      #root {
        padding: 12px;
        gap: 8px;
      }
      
      .section-container.edit-mode {
        padding: 6px;
      }
      
      .section-grid-label {
        font-size: 9px;
        padding: 3px 6px;
      }
      
      /* Hide loose cards on mobile in edit mode */
      .loose-cards-container {
        display: none;
      }
    }
    
    /* Small mobile */
    @media (max-width: 480px) {
      #root {
        padding: 8px;
        gap: 4px;
      }
      
      .section-container {
        border-radius: 4px;
      }
    }

sections: [...]
```

## Combining Both Methods

Use `mediaquery` for layout structure and `custom_css` for styling:

```yaml
type: custom:grid-layout-improved
layout:
  # Desktop grid
  grid-template-columns: 280px 1fr 280px
  grid-template-areas: |
    "header header header"
    "sidebar main right"
    "footer footer footer"
  
  # Responsive grid layouts
  mediaquery:
    "(max-width: 1200px)":
      grid-template-columns: 250px 1fr
      grid-template-areas: |
        "header header"
        "sidebar main"
        "footer footer"
    
    "(max-width: 768px)":
      grid-template-columns: 1fr
      grid-template-areas: |
        "header"
        "main"
        "sidebar"
        "footer"
  
  # Background
  background_image: /local/bg.jpg
  background_blur: 8px
  background_opacity: 0.6
  
  # Responsive styling
  custom_css: |
    /* Desktop */
    #root {
      padding: 24px;
      gap: 16px;
    }
    
    .section-container {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
    }
    
    /* Tablet */
    @media (max-width: 1200px) {
      #root {
        padding: 16px;
        gap: 12px;
      }
      
      .background {
        background-size: 150% auto;
      }
    }
    
    /* Mobile */
    @media (max-width: 768px) {
      #root {
        padding: 12px;
        gap: 8px;
      }
      
      .section-container {
        background: rgba(255, 255, 255, 0.95);
      }
      
      .background {
        filter: blur(5px) !important;
        background-size: 200% auto;
      }
      
      #root.edit-mode .section-grid-label {
        font-size: 9px;
      }
    }
    
    /* Portrait orientation */
    @media (orientation: portrait) {
      #root {
        gap: 12px;
      }
    }
    
    /* Landscape */
    @media (orientation: landscape) {
      #root {
        gap: 20px;
      }
    }

sections: [...]
```

## Common Responsive Patterns

### 3-Column to 1-Column

```yaml
layout:
  # Desktop: 3 columns
  grid-template-columns: 1fr 1fr 1fr
  grid-template-areas: |
    "left center right"
  
  mediaquery:
    "(max-width: 1024px)":
      # Tablet: 2 columns
      grid-template-columns: 1fr 1fr
      grid-template-areas: |
        "left center"
        "right right"
    
    "(max-width: 768px)":
      # Mobile: 1 column
      grid-template-columns: 1fr
      grid-template-areas: |
        "left"
        "center"
        "right"
```

### Sidebar Collapse

```yaml
layout:
  # Desktop: sidebar + main
  grid-template-columns: 300px 1fr
  grid-template-areas: |
    "sidebar main"
  
  mediaquery:
    "(max-width: 768px)":
      # Mobile: stack vertically
      grid-template-columns: 1fr
      grid-template-areas: |
        "main"
        "sidebar"
```

### Header + Content Responsive

```yaml
layout:
  # Desktop
  grid-template-columns: repeat(3, 1fr)
  grid-template-rows: 80px 1fr
  grid-template-areas: |
    "header header header"
    "left center right"
  
  mediaquery:
    "(max-width: 768px)":
      # Mobile: single column
      grid-template-columns: 1fr
      grid-template-rows: 60px auto
      grid-template-areas: |
        "header"
        "center"
        "left"
        "right"
```

## Advanced Responsive CSS

### Hide Sections on Mobile

```yaml
custom_css: |
  @media (max-width: 768px) {
    /* Hide right sidebar on mobile */
    .section-right {
      display: none;
    }
    
    /* Make main section full width */
    .section-main {
      grid-column: 1 / -1;
    }
  }
```

### Different Backgrounds by Device

```yaml
custom_css: |
  /* Desktop background */
  .background {
    background-image: url('/local/bg-desktop.jpg');
  }
  
  /* Tablet background */
  @media (max-width: 1024px) {
    .background {
      background-image: url('/local/bg-tablet.jpg');
    }
  }
  
  /* Mobile background */
  @media (max-width: 768px) {
    .background {
      background-image: url('/local/bg-mobile.jpg');
      filter: blur(5px) !important;
    }
  }
```

### Touch-Optimized Edit Mode

```yaml
custom_css: |
  /* Larger touch targets on touch devices */
  @media (pointer: coarse) {
    #root.edit-mode .section-grid-label {
      padding: 8px 12px;
      font-size: 14px;
    }
    
    .section-container.edit-mode {
      padding: 12px;
    }
  }
```

## Responsive Background Images

### Using Jinja for Responsive Images

```yaml
layout:
  # Serve different images based on screen size (if your server supports it)
  background_image: /local/backgrounds/home-1920.jpg
  
  custom_css: |
    @media (max-width: 1024px) {
      .background {
        background-image: url('/local/backgrounds/home-1024.jpg') !important;
      }
    }
    
    @media (max-width: 768px) {
      .background {
        background-image: url('/local/backgrounds/home-768.jpg') !important;
      }
    }
```

## Testing Responsive Layouts

### Browser DevTools
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select different devices
4. Watch grid reorganize

### Common Breakpoints

```yaml
mediaquery:
  "(max-width: 1920px)": # Large desktop
  "(max-width: 1440px)": # Desktop
  "(max-width: 1200px)": # Small desktop
  "(max-width: 1024px)": # Tablet landscape
  "(max-width: 768px)":  # Tablet portrait / large phone
  "(max-width: 480px)":  # Phone
  "(max-width: 320px)":  # Small phone
```

### Orientation-Based

```yaml
custom_css: |
  @media (orientation: portrait) {
    #root { gap: 12px; }
  }
  
  @media (orientation: landscape) {
    #root { gap: 20px; }
  }
```

## Complete Responsive Example

```yaml
type: custom:grid-layout-improved
title: Responsive Dashboard
layout:
  # Desktop: 3 columns with header and footer
  grid-template-columns: 280px 1fr 280px
  grid-template-rows: 100px 1fr 60px
  grid-gap: 20px
  grid-template-areas: |
    "header header header"
    "left main right"
    "footer footer footer"
  
  # Responsive breakpoints
  mediaquery:
    "(max-width: 1200px)":
      # Medium: 2 columns
      grid-template-columns: 250px 1fr
      grid-gap: 16px
      grid-template-areas: |
        "header header"
        "left main"
        "footer footer"
    
    "(max-width: 768px)":
      # Tablet/Mobile: 1 column
      grid-template-columns: 1fr
      grid-gap: 12px
      grid-template-areas: |
        "header"
        "main"
        "left"
        "footer"
  
  # Background
  background_image: /local/backgrounds/home.jpg
  background_blur: 12px
  background_opacity: 0.7
  
  # Responsive CSS
  custom_css: |
    /* Desktop */
    #root {
      padding: 24px;
    }
    
    .section-container {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px;
    }
    
    /* Tablet */
    @media (max-width: 1200px) {
      #root {
        padding: 16px;
      }
      
      .section-container {
        padding: 12px;
      }
      
      .section-right {
        display: none; /* Hide right sidebar on tablet */
      }
    }
    
    /* Mobile */
    @media (max-width: 768px) {
      #root {
        padding: 12px;
      }
      
      .section-container {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        padding: 8px;
      }
      
      .background {
        filter: blur(8px) !important;
        background-position: top;
      }
      
      /* Larger touch targets */
      #root.edit-mode .section-grid-label {
        padding: 8px 12px;
        font-size: 13px;
      }
    }
    
    /* Small mobile */
    @media (max-width: 480px) {
      #root {
        padding: 8px;
      }
      
      .section-container {
        padding: 6px;
      }
      
      .loose-cards-wrapper {
        grid-template-columns: 1fr; /* Single column for loose cards */
      }
    }

sections:
  - type: grid
    title: Header
    grid_area: header
    cards:
      - type: markdown
        content: "# Dashboard"
  
  - type: grid
    title: Sidebar
    grid_area: left
    cards:
      - type: entities
        entities: [light.living_room]
  
  - type: grid
    title: Main
    grid_area: main
    cards:
      - type: weather-forecast
        entity: weather.home
  
  - type: grid
    title: Right Panel
    grid_area: right
    cards:
      - type: entities
        entities: [sensor.temperature]
  
  - type: grid
    title: Footer
    grid_area: footer
    cards:
      - type: button
        entity: script.good_night
```

## Grid Property Changes

### Dynamic Column Count

```yaml
layout:
  # Desktop: 4 columns
  grid-template-columns: repeat(4, 1fr)
  
  mediaquery:
    "(max-width: 1400px)":
      grid-template-columns: repeat(3, 1fr)
    
    "(max-width: 1024px)":
      grid-template-columns: repeat(2, 1fr)
    
    "(max-width: 768px)":
      grid-template-columns: 1fr
```

### Responsive Gap

```yaml
layout:
  grid-gap: 20px
  
  mediaquery:
    "(max-width: 1024px)":
      grid-gap: 16px
    
    "(max-width: 768px)":
      grid-gap: 12px
    
    "(max-width: 480px)":
      grid-gap: 8px
```

### Auto-Flow Changes

```yaml
layout:
  grid-auto-flow: row
  
  mediaquery:
    "(max-width: 768px)":
      grid-auto-flow: column
```

## CSS Styling Patterns

### Responsive Section Visibility

```yaml
custom_css: |
  /* Show all sections on desktop */
  .section-container {
    display: flex;
  }
  
  /* Hide secondary sections on mobile */
  @media (max-width: 768px) {
    .section-right,
    .section-left {
      display: none;
    }
  }
  
  /* Only in edit mode, show all sections */
  @media (max-width: 768px) {
    #root.edit-mode .section-right,
    #root.edit-mode .section-left {
      display: flex;
      opacity: 0.6;
    }
  }
```

### Responsive Typography

```yaml
custom_css: |
  .section-grid-label {
    font-size: 12px;
  }
  
  @media (max-width: 1024px) {
    .section-grid-label {
      font-size: 11px;
    }
  }
  
  @media (max-width: 768px) {
    .section-grid-label {
      font-size: 10px;
      padding: 3px 6px;
    }
  }
```

### Responsive Backgrounds

```yaml
custom_css: |
  /* Adjust blur and opacity by screen size */
  .background {
    filter: blur(12px);
    opacity: 0.7;
  }
  
  @media (max-width: 1024px) {
    .background {
      filter: blur(10px);
      opacity: 0.75;
    }
  }
  
  @media (max-width: 768px) {
    .background {
      filter: blur(8px);
      opacity: 0.8;
      background-position: 30% center; /* Adjust focal point */
    }
  }
```

## Device-Specific Optimizations

### Touch Devices

```yaml
custom_css: |
  /* Larger hit areas for touch */
  @media (pointer: coarse) {
    .section-container.edit-mode {
      padding: 16px;
      min-height: 120px;
    }
    
    .section-grid-label {
      padding: 8px 14px;
      font-size: 14px;
    }
  }
```

### High DPI Displays

```yaml
custom_css: |
  @media (-webkit-min-device-pixel-ratio: 2),
         (min-resolution: 192dpi) {
    .section-grid-label {
      font-weight: 500; /* Lighter weight on retina */
    }
  }
```

### Hover Capability

```yaml
custom_css: |
  /* Only show hover effects on devices that support it */
  @media (hover: hover) {
    .section-container.edit-mode:hover {
      transform: scale(1.01);
      transition: transform 0.2s;
    }
  }
```

## Best Practices

### 1. Mobile-First Approach
Start with mobile layout, then add desktop features:

```yaml
layout:
  # Mobile (default)
  grid-template-columns: 1fr
  grid-template-areas: |
    "main"
    "sidebar"
  
  mediaquery:
    "(min-width: 768px)":
      # Tablet and up
      grid-template-columns: 250px 1fr
      grid-template-areas: |
        "sidebar main"
```

### 2. Common Breakpoints
Use standard breakpoints for consistency:
- 1920px - Large desktop
- 1440px - Desktop
- 1200px - Small desktop
- 1024px - Tablet landscape
- 768px - Tablet portrait
- 480px - Large phone
- 320px - Small phone

### 3. Test on Real Devices
- Use Chrome DevTools device emulation
- Test on actual phones/tablets
- Check both portrait and landscape
- Test touch interactions

### 4. Performance
```yaml
custom_css: |
  /* Reduce effects on mobile for performance */
  @media (max-width: 768px) {
    .background {
      filter: blur(5px) !important; /* Less blur */
    }
    
    .section-container {
      backdrop-filter: none; /* Remove expensive effects */
    }
  }
```

## Complete Example: Dashboard for All Devices

```yaml
type: custom:grid-layout-improved
title: Responsive Home
layout:
  # Desktop: complex grid
  grid-template-columns: 280px 1fr 280px
  grid-template-rows: 100px 1fr 60px
  grid-gap: 20px
  grid-template-areas: |
    "header header header"
    "left main right"
    "footer footer footer"
  
  # Responsive breakpoints
  mediaquery:
    "(max-width: 1200px)":
      grid-template-columns: 250px 1fr
      grid-gap: 16px
      grid-template-areas: |
        "header header"
        "left main"
        "footer footer"
    
    "(max-width: 768px)":
      grid-template-columns: 1fr
      grid-gap: 12px
      grid-template-areas: |
        "header"
        "main"
        "left"
        "footer"
  
  background_image: /local/backgrounds/home.jpg
  background_blur: 12px
  background_opacity: 0.7
  
  custom_css: |
    /* Base styles */
    #root {
      padding: 24px;
    }
    
    .section-container {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 12px;
    }
    
    /* Edit mode enhancements */
    #root.edit-mode {
      background: rgba(0, 0, 0, 0.02);
    }
    
    /* Tablet adjustments */
    @media (max-width: 1200px) {
      #root { padding: 16px; }
      .background { filter: blur(10px); }
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
      #root { padding: 12px; }
      
      .section-container {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: none;
        border-radius: 8px;
      }
      
      .background {
        filter: blur(6px);
        opacity: 0.5 !important;
      }
      
      .loose-cards-wrapper {
        grid-template-columns: 1fr;
      }
    }
    
    /* Touch device optimizations */
    @media (pointer: coarse) {
      .section-container.edit-mode {
        min-height: 100px;
      }
    }

sections: [...]
```

## Summary

**Use `mediaquery`** for:
- Changing grid structure
- Repositioning sections
- Layout reorganization

**Use `custom_css` with `@media`** for:
- Styling changes
- Visibility toggles
- Spacing adjustments
- Background modifications
- Animation changes

**Combine both** for:
- Complete responsive control
- Structure + styling
- Optimal user experience across devices

The combination gives you ultimate flexibility for responsive dashboards! 📱💻🖥️
