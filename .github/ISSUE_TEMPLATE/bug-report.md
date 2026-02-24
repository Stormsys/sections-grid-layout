---
name: Bug report
about: Report a bug or unexpected behavior
title: ""
labels: "bug"
assignees: ""
---

**Home Assistant version:** 2024.X.X
**Sections Grid Layout version:**
**Browser:** (e.g. Chrome 120, Safari 17, Firefox 121)

## Description

What happened:

What you expected:

## Steps to Reproduce

1.
2.
3.

## Configuration

```yaml
# Minimal YAML to reproduce the issue
type: custom:sections-grid-layout
layout:
  grid-template-areas: |
    "main"
sections:
  - grid_area: main
    type: grid
    cards: []
```

## Browser Console Errors

```
(paste any errors here)
```

## Checklist

- [ ] I am using the latest version of sections-grid-layout
- [ ] I am running Home Assistant 2024.2 or newer
- [ ] I have checked existing issues for duplicates
- [ ] I have included a minimal configuration that reproduces the issue
