# Digital Garden

A SvelteKit-based digital garden with wiki-links, backlinks, search, and dual-pane navigation.

## Features

- 🌱 **Wiki-style linking** — `[[note-title]]` or `[[slug|display text]]`
- 🔗 **Automatic backlinks** — see what links to each note
- 🔍 **Full-text search** — client-side Fuse.js over server-built index
- 🔒 **Public/private notes** — visibility control with token auth
- 📦 **In-memory cache** — fast reads with webhook-based invalidation
- 🎨 **Dual-pane UI** — browse sidebar, read in main pane
- ⚡ **Edge-ready** — SvelteKit on Vercel with serverless functions

## Local Development

```bash
# Install dependencies
npm install

# Create .env from example
cp .env.example .env

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

**Required for production (GitHub source):**
- `GITHUB_TOKEN` — personal access token with `repo` scope
- `GITHUB_REPO_OWNER` — your GitHub username
- `GITHUB_REPO_NAME` — notes repository name
- `GITHUB_WEBHOOK_SECRET` — webhook secret (generate with `openssl rand -hex 32`)
- `GARDEN_TOKEN` — API auth token for private notes and admin endpoints

**Optional:**
- `NOTES_SOURCE` — `"mock"` (local disk) or `"github"` (default: `"mock"`)
- `NOTES_DIR` — path to notes directory when using mock source (default: `"notes"`)
- `ALLOW_DEV_WEBHOOK` — `"true"` to enable `?dev=1` bypass for local testing

## Deployment to Vercel

### 1. Create GitHub Repository for Notes

Your notes live in a separate repo with this structure:

```
notes-repo/
├── notes/
│   ├── 001-welcome.md
│   ├── 002-getting-started.md
│   └── ...
└── README.md
```

Each note has YAML frontmatter:

```yaml
---
title: "Note Title"
slug: "note-slug"
date: 2026-09-06
tags: [tag1, tag2]
visibility: public  # or "private"
excerpt: "Brief summary"
---

# Note content here

Use [[wiki-links]] to connect notes.
```

### 2. Generate Tokens

```bash
# GitHub personal access token (repo scope)
# → https://github.com/settings/tokens

# Webhook secret
openssl rand -hex 32

# Garden admin token
openssl rand -hex 32
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NOTES_SOURCE=github
# - GITHUB_TOKEN=ghp_...
# - GITHUB_REPO_OWNER=yourusername
# - GITHUB_REPO_NAME=your-notes-repo
# - GITHUB_WEBHOOK_SECRET=whsec_...
# - GARDEN_TOKEN=random_secret_...
# - ALLOW_DEV_WEBHOOK=false
```

### 4. Configure GitHub Webhook

In your **notes repository** (not this one):

1. Go to Settings → Webhooks → Add webhook
2. **Payload URL**: `https://your-garden.vercel.app/api/webhook`
3. **Content type**: `application/json`
4. **Secret**: (same as `GITHUB_WEBHOOK_SECRET` env var)
5. **Events**: Just the push event
6. Save

Now when you push notes to GitHub, the cache auto-invalidates.

## Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── cache.ts          # In-memory cache with TTL
│   │   ├── parser.ts          # Markdown + wiki-link rendering
│   │   ├── mock-source.ts     # Local disk notes source
│   │   ├── github-source.ts   # GitHub GraphQL source
│   │   ├── source.ts          # Source selector
│   │   └── webhook.ts         # Signature verification
│   ├── client/
│   │   └── search.ts          # Fuse.js search
│   └── types.ts               # Shared types
├── routes/
│   ├── +layout.svelte         # App shell
│   ├── +page.svelte           # Home with dual-pane UI
│   ├── notes/[slug]/          # Individual note view
│   ├── tags/                  # Tag index and detail
│   └── api/
│       ├── notes/             # Notes API
│       ├── search/            # Search index
│       ├── webhook/           # GitHub webhook handler
│       └── cache/             # Cache admin (requires auth)
└── notes/                     # Sample notes (mock source)
```

## API Endpoints

All endpoints return JSON.

### `GET /api/notes`
List all notes metadata. Query params:
- `?tag=tagname` — filter by tag

### `GET /api/notes/:slug`
Get full note content + rendered HTML + backlinks.
- Returns 403 for private notes without auth
- Auth: `Authorization: Bearer ${GARDEN_TOKEN}`

### `GET /api/search`
Get search index (public notes only by default).
- `?include=private` with auth header includes private notes

### `POST /api/webhook`
GitHub webhook receiver. Invalidates cache on push events.
- Verifies `x-hub-signature-256` header
- Dev bypass: `?dev=1` (requires `ALLOW_DEV_WEBHOOK=true`)

### `GET /api/cache`
Cache statistics (requires auth).

### `POST /api/cache`
Manually invalidate cache (requires auth).
Body: `{ "pattern": "note-" }` or `{}` to clear all.

## License

MIT
