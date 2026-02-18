# Auto-Created Sections Behavior

## How Auto-Created Sections Work

When you define `grid-template-areas` but don't explicitly configure all sections, empty sections are **automatically created in edit mode** for visualization.

### Visual Indicators

**Explicitly Defined Sections** (in YAML):
- Blue label: `section-name`
- Solid dashed border
- Persists on reload ✅

**Auto-Created Sections** (temporary):
- Orange label: `section-name (temp)`
- Dotted border
- **Disappears on reload** ⚠️

## Important: Cards Won't Persist in Auto-Created Sections!

If you drag a card into an auto-created section:
- Card appears in edit mode ✓
- **Card disappears on reload** ✗
- Section was never saved to YAML

## ✅ How to Make Sections Persist

### Add Sections to YAML

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-areas: |
    "header header"
    "sidebar main"
    "footer footer"

# Define sections explicitly to persist
sections:
  - type: grid
    title: Header
    grid_area: header
    cards: []  # Start empty, add cards via UI
  
  - type: grid
    title: Sidebar
    grid_area: sidebar
    cards: []
  
  - type: grid
    title: Main
    grid_area: main
    cards: []
  
  - type: grid
    title: Footer
    grid_area: footer
    cards: []
```

Now all sections persist! Add cards via drag-and-drop and they'll be saved.

## Workflow

### Option A: Pre-Define All Sections (Recommended)

1. Define `grid-template-areas`
2. Add all sections with `grid_area` in YAML
3. Leave `cards: []` empty
4. Use drag-and-drop to add cards
5. Everything persists! ✅

### Option B: Use Auto-Created as Visual Aid

1. Define only `grid-template-areas`
2. See all grid spots in edit mode
3. **Don't add cards to temporary sections**
4. Add sections to YAML as needed
5. Then add cards

## Why This Limitation?

Auto-created sections are **runtime helpers** for visualizing your grid structure. They're not part of your config, so:
- They exist only in edit mode
- Changes aren't saved to YAML
- They disappear on reload

To save sections, you must define them in YAML.

## Quick Reference

### Temporary Section (Auto-Created)
```
┌─────────────────────────┐
│         [sidebar (temp)]│ ← Orange, italic
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄│ ← Dotted border
│   Drop cards here       │
│   ⚠️ Won't persist!      │
└─────────────────────────┘
```

### Persistent Section (In YAML)
```
┌─────────────────────────┐
│            [sidebar]    │ ← Blue, solid
│ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌│ ← Dashed border
│   Native section        │
│   ✅ Persists on reload  │
└─────────────────────────┘
```

## Minimal Persistent Config

```yaml
type: custom:grid-layout-improved
layout:
  grid-template-areas: |
    "a b"
    "c d"

sections:
  - type: grid
    grid_area: a
    cards: []
  - type: grid
    grid_area: b
    cards: []
  - type: grid
    grid_area: c
    cards: []
  - type: grid
    grid_area: d
    cards: []
```

Even simpler - use the same name:
```yaml
sections:
  - type: grid
    title: A
    grid_area: a
    cards: []
  - type: grid
    title: B
    grid_area: b
    cards: []
  # ... etc
```

## Summary

- **Auto-created sections** = Temporary visual aids
- **YAML-defined sections** = Persistent, functional
- **Best practice**: Define all sections in YAML with `cards: []`
- **Visual distinction**: Orange "(temp)" label = temporary

This makes it clear which sections are real!
