# Running Layout Card Improved Alongside Stock Layout Card

## Overview

Layout Card Improved has been designed to run alongside the original layout-card without conflicts. All custom elements and card types use the `-improved` suffix.

## Installation for Dual Running

### File Naming
- **Built file**: `layout-card-improved.js`
- **HACS name**: `layout-card-improved`
- **Package name**: `layout-card-improved`

### Custom Element Names

All custom elements have been renamed with the `-improved` suffix:

| Original | Improved |
|----------|----------|
| `layout-card` | `layout-card-improved` |
| `layout-card-editor` | `layout-card-improved-editor` |
| `grid-layout` | `grid-layout-improved` |
| `masonry-layout` | `masonry-layout-improved` |
| `horizontal-layout` | `horizontal-layout-improved` |
| `vertical-layout` | `vertical-layout-improved` |
| `gap-card` | `gap-card-improved` |
| `gap-card-editor` | `gap-card-improved-editor` |
| `layout-break` | `layout-break-improved` |
| `layout-break-editor` | `layout-break-improved-editor` |

## Using Layout Card Improved

### As a View Layout

When editing a view, select one of these layout types:

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-columns: repeat(3, 1fr)
  custom_css: |
    /* Your custom CSS here */
cards:
  - type: entities
    entities:
      - light.living_room
```

Available view types:
- `custom:grid-layout-improved`
- `custom:masonry-layout-improved`
- `custom:horizontal-layout-improved`
- `custom:vertical-layout-improved`

### As a Card

Use the improved layout card within another view:

```yaml
type: custom:layout-card-improved
layout_type: grid-improved
layout:
  grid-template-columns: 1fr 1fr
cards:
  - type: entities
    entities:
      - light.bedroom
```

### Helper Cards

#### Gap Card
```yaml
type: custom:gap-card-improved
height: 100
```

#### Layout Break
```yaml
type: custom:layout-break-improved
```

## Migration from Stock Layout Card

If you want to migrate an existing configuration from stock layout-card to the improved version:

1. **View layouts**: Change `custom:grid-layout` to `custom:grid-layout-improved`
2. **Layout cards**: Change `type: custom:layout-card` to `type: custom:layout-card-improved`
3. **Layout types**: Add `-improved` suffix to layout_type values
4. **Helper cards**: Add `-improved` suffix to gap-card and layout-break

### Example Migration

**Before (Stock):**
```yaml
type: custom:grid-layout
layout:
  grid-template-columns: 1fr 1fr
cards:
  - type: custom:gap-card
    height: 50
  - type: entities
    entities:
      - light.living_room
```

**After (Improved):**
```yaml
type: custom:grid-layout-improved
layout:
  grid-template-columns: 1fr 1fr
  custom_css: |
    /* Now you can add custom CSS! */
cards:
  - type: custom:gap-card-improved
    height: 50
  - type: entities
    entities:
      - light.living_room
```

## New Features Exclusive to Improved Version

### 1. Custom CSS Injection
```yaml
type: custom:grid-layout-improved
layout:
  custom_css: |
    #root {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
```

### 2. Section-Based Grid Layout
```yaml
type: custom:grid-layout-improved
layout:
  grid-template-areas: |
    "header header"
    "sidebar main"
  sections:
    header:
      grid_area: header
    sidebar:
      grid_area: sidebar
    main:
      grid_area: main
cards:
  - type: markdown
    content: "Header"
    view_layout:
      grid_area: header
```

### 3. Auto-Detected Sections in Edit Mode

When you define `grid-template-areas`, sections are automatically detected and displayed with visual boundaries in edit mode.

## Compatibility

- Both versions can coexist in the same Home Assistant instance
- Use stock layout-card for existing dashboards
- Use layout-card-improved for new dashboards or when you need the enhanced features
- No risk of conflicts due to unique naming

## Troubleshooting

### Card not showing in picker
- Ensure `layout-card-improved.js` is loaded in your resources
- Clear browser cache
- Check browser console for errors

### Wrong card loaded
- Verify you're using the `-improved` suffix in your YAML
- Check that the resource path points to `layout-card-improved.js`

### Migrating back to stock
- Simply remove the `-improved` suffix from all card types
- Both versions use compatible YAML configurations (except for improved-only features like `custom_css` and `sections`)

## Summary

Layout Card Improved provides enhanced functionality while maintaining full compatibility with the stock version. The `-improved` naming convention ensures you can use both versions simultaneously without conflicts.
