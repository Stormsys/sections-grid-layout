# Layout Card Improved v3.0.0 Release Notes

## 🎉 Major Release - Section-Based Layouts & Custom CSS

This is a major feature release that transforms how you organize and style your Home Assistant dashboards.

## ✨ What's New

### 1. Section-Based Grid Layouts
Grid areas now appear as **visible sections in edit mode**, similar to the native HA sections dashboard:
- Each grid area displays with a clear border and header
- Empty sections show helpful placeholders
- Visual organization makes layout structure obvious
- Sections disappear in normal mode for clean presentation

### 2. Custom CSS Injection
Complete styling control with direct CSS injection:
```yaml
layout:
  custom_css: |
    #root {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
```

### 3. Unassigned Cards Section
Automatic staging area for cards in edit mode:
- Orange-highlighted section at bottom of grid
- Shows cards not assigned to any grid area
- Makes dashboard organization intuitive
- Hidden in normal viewing mode

### 4. Section Add Buttons
Quick card placement with + buttons:
- Each section header has a + button
- Click to add cards directly to that section
- Streamlined workflow for building layouts

## 🔧 Breaking Changes

### Required Updates

**Card Types** - All now require `-improved` suffix:
- `custom:layout-card` → `custom:layout-card-improved`
- `custom:grid-layout` → `custom:grid-layout-improved`
- `custom:masonry-layout` → `custom:masonry-layout-improved`
- `custom:horizontal-layout` → `custom:horizontal-layout-improved`
- `custom:vertical-layout` → `custom:vertical-layout-improved`
- `custom:gap-card` → `custom:gap-card-improved`
- `custom:layout-break` → `custom:layout-break-improved`

**Resource URL** - Changed for HACS:
```yaml
# Old
/hacsfiles/lovelace-layout-card/layout-card.js

# New
/hacsfiles/lovelace-layout-card-improved/layout-card-improved.js
```

## 📦 Installation

### New Installation
1. Add custom repository in HACS: `https://github.com/Stormsys/lovelace-layout-card-improved`
2. Install "Layout Card Improved"
3. Add resource: `/hacsfiles/lovelace-layout-card-improved/layout-card-improved.js`
4. Clear browser cache

### Updating from Previous Version
1. Update in HACS
2. Update resource URL in Lovelace
3. Update YAML configs to use `-improved` card types
4. Clear browser cache
5. Restart Home Assistant

## 🎯 Key Features

### Section Auto-Detection
Automatically creates sections from `grid-template-areas`:
```yaml
type: custom:grid-layout-improved
layout:
  grid-template-areas: |
    "header header"
    "sidebar main"
```
Sections are automatically detected and displayed in edit mode!

### Custom CSS Examples

**Gradient Background:**
```yaml
custom_css: |
  #root {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
```

**Section Styling:**
```yaml
custom_css: |
  .grid-section[data-section="header"] {
    background: var(--primary-color);
  }
```

**Animations:**
```yaml
custom_css: |
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  #root > * {
    animation: fadeIn 0.5s ease-out;
  }
```

## 🤝 Dual-Run Compatible

Can run alongside stock layout-card:
- Different element names prevent conflicts
- Use both versions simultaneously
- Gradual migration supported

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup
- **[HACS_INSTALLATION.md](HACS_INSTALLATION.md)** - Complete installation guide
- **[GRID_SECTIONS_USAGE.md](GRID_SECTIONS_USAGE.md)** - Feature documentation
- **[DUAL_RUN_GUIDE.md](DUAL_RUN_GUIDE.md)** - Compatibility information
- **[CHANGELOG.md](CHANGELOG.md)** - Full changelog

## 🐛 Bug Fixes

- Fixed view editor dropdown breaking with multiple layout cards
- Improved patch protection against conflicts
- Better schema validation
- Enhanced dual-run compatibility

## 🔮 What's Next

Future enhancements being considered:
- Drag-and-drop card reordering between sections
- Section templates
- Visual grid area designer
- More CSS injection points

## 💡 Tips

1. **Start Simple**: Enable sections, then add custom CSS
2. **Use Edit Mode**: All new features designed for edit mode visibility
3. **Test Gradually**: Update one dashboard at a time
4. **Clear Cache**: Always clear browser cache after updates

## ⚠️ Important Notes

- **Backup your configs** before updating
- **Test in a non-production dashboard** first
- **Clear browser cache** after installation
- **Restart Home Assistant** after resource changes

## 📊 Compatibility

- **Home Assistant**: 2021.10.0+
- **HACS**: Any recent version
- **Browsers**: Chrome 88+, Firefox 86+, Safari 14+

## 🙏 Acknowledgments

Built on the excellent foundation of the original layout-card by Thomas Lovén.

## 📞 Support

- **Issues**: https://github.com/Stormsys/lovelace-layout-card-improved/issues
- **Discussions**: GitHub Discussions
- **Documentation**: See guides in repository

---

**Happy Dashboarding! 🎨**
