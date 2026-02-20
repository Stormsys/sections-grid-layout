# Compatibility & Migration

---

## Compatibility with layout-card

Sections Grid Layout and the original [layout-card](https://github.com/thomasloven/lovelace-layout-card) can be loaded at the same time:

- This plugin registers only the `sections-grid-layout` element -- it does not touch masonry, horizontal, or vertical layouts
- The view-type dropdown patch only adds the **Sections Grid** option; layout-card's options are untouched
- The patch guard uses a different flag (`_sectionsGridLayoutPatched`) so both scripts can patch `hui-view-editor` independently without conflict

---

## Migrating from lovelace-layout-card-improved

Replace the view type in your YAML:

| Old | New |
|---|---|
| `custom:grid-layout-improved` | `custom:sections-grid-layout` |
