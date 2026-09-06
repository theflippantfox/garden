---
title: Getting Started
slug: getting-started
date: 2026-09-05
tags: [meta, how-to]
status: active
visibility: public
excerpt: How to write notes, link them, and watch the garden grow.
---

# Getting Started

## Adding notes

Drop a markdown file into `notes/`. Frontmatter is optional but recommended:

```yaml
---
title: My Note Title
date: 2026-09-01
tags: [topic, subtopic]
visibility: public
---
```

## Linking

Use `[[wiki-style]]` links. `[[tag-name|alias]]` lets you display different text.

A link to [[welcome]] exists even before that note does — it'll show up red.

## Searching

The search bar at the top runs locally in your browser after the index loads.
Try searching for "link" or "tag".