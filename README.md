# Iteration Overlay — a Cradle Universe Viewer

An interactive 3D viewer of Will Wight's Willverse: explore Cradle (Iteration 110) and the
worlds of Sector 11 the way an Abidan would — orbital views, Presence-narrated event records,
deep-dive archives, and the Edge of the Way.

**Unofficial fan project.** Cradle and all related works © Will Wight / Hidden Gnome Publishing.
Archive lookups use the community-run Abidan Archives wiki (CC-BY-SA). Not affiliated with or
endorsed by the author.

Everything is one file: `index.html`. No build step, no server-side code.

## Publish it (pick one)

### Option A — Netlify Drop (fastest, ~60 seconds)
1. Go to https://app.netlify.com/drop
2. Drag this folder (or just `index.html`) onto the page.
3. Done — you get a live `*.netlify.app` URL immediately. Free tier, HTTPS included.
4. Re-publish after updates by dragging the new file onto the same site's Deploys page.

### Option B — GitHub Pages (best for ongoing development)
1. Create a public repo (e.g. `iteration-overlay`).
2. Add `index.html` and `README.md`, commit, push.
3. Repo Settings → Pages → Source: "Deploy from a branch" → `main` / root → Save.
4. Live at `https://<your-username>.github.io/iteration-overlay/` within a minute or two.
5. Every future push auto-redeploys — ideal while we keep iterating.

### Option C — itch.io (best for reaching fans)
1. Create a project at https://itch.io → "HTML" kind of project.
2. Zip `index.html` (must be named exactly that) and upload; check "This file will be played in the browser."
3. Set viewport to fullscreen/mobile-friendly, tag it `cradle`, `fan-game`, `interactive-fiction`.
4. r/Iteration110Cradle generally loves fan tools — worth a post once it's up.

## Notes
- **HTTPS hosting is required** for the wiki archive relay (browsers block the API call from
  `file://`). All three options above serve HTTPS. The offline local cache covers any gaps.
- Boot takes ~15–25 s while planet textures render (progress is shown); phones render at
  reduced resolution automatically.
- Narration: drop recorded audio URLs into the `audioMap` object at the top of the script
  (keys are record IDs). Until then a synthesized Presence voice stands in.
- Before attaching celebrity narration or doing anything commercial, get a nod from Hidden
  Gnome — they're famously fan-friendly, but ask first.
