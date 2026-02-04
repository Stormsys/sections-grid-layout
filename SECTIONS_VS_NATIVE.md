# Grid Sections vs Native HA Sections

## Important: Understanding the Difference

**Grid Layout Improved** sections and **Native Home Assistant Sections** are different systems with different capabilities.

### Native HA Sections (Recommended for Full Functionality)

**What it is:**
- Built-in Home Assistant dashboard type (2023.9+)
- Full drag-and-drop support
- Native section management
- Official HA feature

**Capabilities:**
- ✅ Drag cards between sections
- ✅ Reorder cards within sections  
- ✅ Visual section badges
- ✅ Built-in add card buttons
- ✅ Full Lovelace editor integration
- ✅ Section-level visibility controls

**How to use:**
```yaml
views:
  - type: sections  # Native HA sections view
    sections:
      - type: grid
        cards:
          - type: entities
            entities: [light.living_room]
```

### Grid Layout Improved Sections (Visual Organization)

**What it is:**
- Visual aid for organizing grid layouts in edit mode
- Shows grid areas as labeled sections
- Helps visualize grid-template-areas structure
- Enhancement for CSS Grid layouts

**Capabilities:**
- ✅ Visual section boundaries in edit mode
- ✅ Section headers showing grid area names
- ✅ Custom CSS styling
- ✅ Auto-detection from grid-template-areas
- ✅ Unassigned cards staging area
- ✅ + buttons to add cards to sections
- ❌ **No drag-and-drop between sections**
- ❌ No native section badges
- ⚠️  Cards must be manually assigned via YAML

**How to use:**
```yaml
views:
  - type: custom:grid-layout-improved
    layout:
      grid-template-areas: |
        "header header"
        "sidebar main"
      sections:
        header: { grid_area: header }
        sidebar: { grid_area: sidebar }
        main: { grid_area: main }
    cards:
      - type: entities
        entities: [light.living_room]
        view_layout:
          grid_area: sidebar  # Manually assign to section
```

## When to Use Each

### Use Native HA Sections When:
- You want full drag-and-drop functionality
- You need simple section-based layouts
- You want the official HA experience
- You don't need complex CSS Grid features

### Use Grid Layout Improved When:
- You need complex CSS Grid layouts
- You want custom grid-template-areas
- You need custom CSS styling
- You're comfortable editing YAML
- You want visual aid for grid organization

## Assigning Cards to Grid Sections

Since Grid Layout Improved doesn't have native drag-and-drop, cards must be assigned via YAML:

### Method 1: Set grid_area in view_layout
```yaml
cards:
  - type: entities
    title: "Living Room"
    entities:
      - light.living_room
    view_layout:
      grid_area: sidebar  # This assigns the card to the "sidebar" section
```

### Method 2: Edit Card Configuration
1. Click the **edit icon** (pencil) on any card
2. Switch to **YAML mode**
3. Add or modify the `view_layout` section:
   ```yaml
   view_layout:
     grid_area: your-section-name
   ```
4. Save the card

### Method 3: Use the + Button
1. In edit mode, click the **+** button in any section header
2. Select a card type
3. The card will attempt to be assigned to that section
4. You may need to manually edit the card to confirm the `grid_area` assignment

## Visual Indicators

### In Edit Mode:

**Regular Sections:**
- Blue header with section name
- Dashed border
- Shows all cards assigned to that grid area
- Empty sections show placeholder text

**Unassigned Cards Section:**
- Orange header
- Contains cards without `grid_area` assignment
- Only visible in edit mode
- Helps you identify cards that need assignment

### In Normal Mode:
- No section borders or headers
- Clean presentation
- Cards render in their grid positions
- Identical to regular grid layout

## Limitations

### What Grid Sections Cannot Do:
1. **No Drag-and-Drop**: You cannot drag cards between sections. Use YAML to reassign.
2. **No Automatic Assignment**: Cards don't auto-assign when moved. Manual YAML edit required.
3. **Not Native Sections**: This is a visual enhancement, not HA's native sections system.
4. **Edit-Time Visual Only**: Section boundaries only show in edit mode.

### Workarounds:
1. **For Drag-and-Drop**: Use native HA sections view instead
2. **For Quick Assignment**: Use the + button and then edit the card's YAML
3. **For Visualization**: The sections help you see your grid structure while editing

## Migration Guide

### From Grid Layout Improved to Native Sections

If you want full drag-and-drop:

**Before (Grid Layout Improved):**
```yaml
type: custom:grid-layout-improved
layout:
  grid-template-areas: |
    "header header"
    "sidebar main"
cards:
  - type: entities
    view_layout:
      grid_area: sidebar
```

**After (Native Sections):**
```yaml
type: sections
sections:
  - type: grid
    title: Header
    cards:
      - type: markdown
        content: "Header"
  - type: grid
    title: Sidebar
    cards:
      - type: entities
        entities: [light.living_room]
  - type: grid
    title: Main
    cards:
      - type: weather-forecast
```

## Best Practices

### For Grid Layout Improved Sections:

1. **Define Sections Clearly**: Use meaningful section names
2. **Document Grid Areas**: Add comments in YAML for complex layouts
3. **Use Unassigned Section**: Stage new cards here before assigning
4. **Test in Edit Mode**: Verify section organization visually
5. **Assign Consistently**: Always set `view_layout.grid_area` for proper placement

### Example Best Practice Config:

```yaml
type: custom:grid-layout-improved
layout:
  # Define grid structure
  grid-template-columns: 300px 1fr 300px
  grid-template-rows: 80px 1fr auto
  grid-gap: 12px
  grid-template-areas: |
    "header header header"
    "left-sidebar main right-sidebar"
    "footer footer footer"
  
  # Define sections for edit mode visualization
  sections:
    header: { grid_area: header }
    left-sidebar: { grid_area: left-sidebar }
    main: { grid_area: main }
    right-sidebar: { grid_area: right-sidebar }
    footer: { grid_area: footer }

cards:
  # Header cards
  - type: markdown
    content: "# Dashboard"
    view_layout:
      grid_area: header
  
  # Left sidebar cards  
  - type: entities
    title: "Controls"
    entities: [light.living_room]
    view_layout:
      grid_area: left-sidebar
  
  # Main area cards
  - type: weather-forecast
    entity: weather.home
    view_layout:
      grid_area: main
```

## Summary

| Feature | Grid Layout Improved | Native HA Sections |
|---------|---------------------|-------------------|
| Drag-and-Drop | ❌ No | ✅ Yes |
| Visual Sections | ✅ Edit Mode Only | ✅ Always |
| Custom CSS Grid | ✅ Yes | ❌ Limited |
| Custom CSS | ✅ Yes | ❌ No |
| Complex Layouts | ✅ Yes | ❌ Simple Only |
| Manual Assignment | ⚠️ Required | ✅ Automatic |
| Official Support | ❌ Community | ✅ Official |

**Recommendation**: Use native HA sections for simple layouts with drag-and-drop. Use Grid Layout Improved for complex CSS Grid layouts with custom styling, understanding that card assignment is manual.
