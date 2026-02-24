# Changelog

## 0.1.0-alpha

Initial release as **sections-grid-layout**, forked from [lovelace-layout-card](https://github.com/thomasloven/lovelace-layout-card) by Thomas Loven.

### Added
- CSS Grid view layout with `grid-template-areas`, `grid-template-columns`, `grid-template-rows`
- Native `hui-section` wrappers with per-section styling (scrollable, background, tint, blur, zoom, padding, overflow, CSS variables)
- Jinja-like template evaluation in `custom_css` and `background_image` (`states()`, `state_attr()`, `is_state()`, conditionals)
- Full-screen overlay system with pulse/fade/flash/slide-up/none animations
- Background images with blur, opacity, and template support
- Kiosk mode for wall-mounted dashboards with mobile fallback
- Named breakpoints and responsive media query overrides (layout and per-section)
- Section YAML editor (ha-yaml-editor / ha-code-editor / textarea fallback)
- Layout and per-section zoom
- Edit-mode overlay tester panel
- Coexistence with stock layout-card via distinct guard flag

### Removed
- Masonry, horizontal, and vertical layout types (sections-grid-layout registers only the grid view)
- `gap-card` and `layout-break` helper cards
- `BaseLayout` / `BaseColumnLayout` class hierarchy (GridLayout extends LitElement directly)
