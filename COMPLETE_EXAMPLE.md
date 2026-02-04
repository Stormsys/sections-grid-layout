# Complete Working Example

## Full Configuration with All Features

Here's a complete example showing **native sections in CSS Grid** + **custom CSS** + **auto-created empty sections** + **loose cards**:

```yaml
type: custom:grid-layout-improved
title: My Dashboard
layout:
  # Define your grid structure
  grid-template-columns: 280px 1fr 280px
  grid-template-rows: 100px 1fr 80px
  grid-gap: 16px
  grid-template-areas: |
    "header header header"
    "left-sidebar main right-sidebar"
    "footer footer footer"
  
  # Custom CSS styling
  custom_css: |
    /* Style the grid container */
    #root {
      padding: 20px;
      background: var(--lovelace-background, #fafafa);
    }
    
    /* Style section containers in edit mode */
    .section-container.edit-mode {
      border-width: 3px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    /* Style specific sections by grid area */
    .section-container[data-grid-area="header"] {
      background: rgba(3, 169, 244, 0.08);
    }
    
    .section-container[data-grid-area="footer"] {
      background: rgba(76, 175, 80, 0.08);
    }
    
    /* Style the grid area labels */
    .section-grid-label {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    
    /* Style loose cards container */
    .loose-cards-container {
      background: rgba(255, 152, 0, 0.08);
      border-width: 3px;
    }
    
    /* Add animations */
    .section-container {
      animation: fadeIn 0.4s ease-out;
    }
    
    @keyframes fadeIn {
      from { 
        opacity: 0;
        transform: translateY(10px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

# Define sections with content
sections:
  - type: grid
    title: Header
    grid_area: header
    cards:
      - type: markdown
        content: |
          # 🏠 My Smart Home Dashboard
          Welcome to your control center
  
  - type: grid
    title: Main Content
    grid_area: main
    cards:
      - type: weather-forecast
        entity: weather.home
        show_forecast: true
      
      - type: custom:bubble-card
        card_type: button
        button_type: state
        entity: light.living_room
        name: Living Room
  
  - type: grid
    title: Left Sidebar
    grid_area: left-sidebar
    cards:
      - type: entities
        title: Quick Controls
        entities:
          - light.bedroom
          - switch.fan
          - climate.home
  
  # right-sidebar section will be AUTO-CREATED (empty, visible in edit mode)
  # footer section will be AUTO-CREATED (empty, visible in edit mode)

# Loose cards appear at bottom in edit mode
cards:
  - type: button
    entity: light.hallway
    name: Hallway Light
    # This appears in "Unassigned Cards" at bottom in edit mode
  
  - type: entities
    title: Sensors
    entities:
      - sensor.temperature
      - sensor.humidity
    # Drag this into any section!
```

## What You See

### In Edit Mode:

**Grid Layout (top):**
```
┌──────────────────────────────────────────────────┐
│  [header] 🏠 Header Section                     │
│  ╔═══════════════════════════════════════════╗  │
│  ║  My Smart Home Dashboard                  ║  │
│  ╚═══════════════════════════════════════════╝  │
└──────────────────────────────────────────────────┘

┌─────────────┬───────────────┬──────────────┐
│ [left-sid…] │ [main]        │ [right-sid…] │
│ Quick       │ Weather       │ (empty)      │
│ Controls    │ Bubble Card   │ Drop here    │
│             │               │              │
└─────────────┴───────────────┴──────────────┘

┌──────────────────────────────────────────────────┐
│  [footer] (empty section - auto-created)        │
│  Drop cards here                                 │
└──────────────────────────────────────────────────┘
```

**Loose Cards (bottom):**
```
┌──────────────────────────────────────────────────┐
│ 🟠 Unassigned Cards                              │
│ Drag these cards into sections above             │
│ ┌──────────────┐  ┌──────────────┐             │
│ │ Hallway Light│  │ Sensors      │             │
│ └──────────────┘  └──────────────┘             │
└──────────────────────────────────────────────────┘
```

### In Normal Mode:

Just your sections and cards, beautifully positioned in the grid. No borders, no labels, no loose cards container.

## Features Demonstrated

### 1. Auto-Created Empty Sections ✅
- `right-sidebar` section auto-created
- `footer` section auto-created
- Both visible in edit mode with labels
- Ready to receive cards via drag-and-drop

### 2. Native Sections with Full Drag-and-Drop ✅
- Each section is a real `hui-section`
- Drag cards within sections
- Drag cards between sections
- Section + buttons work
- All native features available

### 3. Custom CSS ✅
- Style the grid container
- Style sections by grid area
- Custom animations
- Responsive design
- Full CSS control

### 4. Loose Cards Container ✅
- Shows unassigned cards
- Only visible in edit mode
- Draggable into sections
- Orange border to distinguish

### 5. Visual Edit Mode ✅
- Grid area labels in corners
- Dashed borders on sections
- Dotted borders on empty sections
- Hover effects
- Clean normal mode

## Minimal Configuration

Want to start simple? Just do this:

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-areas: |
    "a b"
    "c d"
```

That's it! In edit mode you'll see 4 empty sections (a, b, c, d) ready for your cards!

## Custom CSS Examples

### Glassmorphism Effect
```yaml
custom_css: |
  #root {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }
  .section-container {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
  }
```

### Dark Mode Sections
```yaml
custom_css: |
  .section-container.edit-mode {
    background: rgba(0, 0, 0, 0.6);
    border-color: #4a9eff;
  }
  .section-grid-label {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
```

### Per-Section Theming
```yaml
custom_css: |
  [data-grid-area="header"] {
    background: linear-gradient(to right, #ff6b6b, #ee5a6f);
  }
  [data-grid-area="sidebar"] {
    background: linear-gradient(to bottom, #4facfe, #00f2fe);
  }
  [data-grid-area="main"] {
    background: linear-gradient(135deg, #667eea, #764ba2);
  }
```

## Summary

This configuration gives you:
- ✅ Ultra-simple setup (just define grid-template-areas)
- ✅ All grid areas auto-created as sections
- ✅ Full native drag-and-drop
- ✅ Complete CSS customization
- ✅ Visual edit mode with labels
- ✅ Loose cards staging area
- ✅ Clean normal mode presentation

This is the best of both worlds: Native HA sections functionality + CSS Grid layout power + Custom CSS styling! 🎉
