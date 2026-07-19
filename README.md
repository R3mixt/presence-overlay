# Iteration Overlay — a Cradle Universe Viewer

An interactive 3D viewer of Will Wight's Willverse: explore Cradle (Iteration 110) and the
worlds of the Way as an Abidan would — orbital views, Presence-narrated event records,
deep-dive archives, sector markers, and the Edge of the Way.

**Unofficial fan project.** Cradle and all related works © Will Wight / Hidden Gnome Publishing.
Archive lookups use the community-run Abidan Archive wiki (CC-BY-SA). Not affiliated with or
endorsed by the author.

Static site — no build step, no server-side code. Any static host (GitHub Pages, Netlify,
itch.io) works as-is.

## Layout

```
index.html          markup only
css/style.css       all styling
data/worlds.js      visual parameters for each rendered world
data/records.js     every selectable record: iterations, sectors, stations, surface POIs
data/lore.js        audio map, wiki routing, offline lore cache
js/noise.js         seeded 3D noise + small geometry helpers
js/geography.js     Cradle's map data (continents, ranges, rivers) + elevation models
js/terrain.js       texture pipeline: heightfield → color/normal/roughness → clouds
js/audio.js         sound design, ambience, mute
js/voice.js         speech queue: on-device neural TTS (Kokoro) + system-voice fallback
js/ui.js            Presence panel, typewriter, deep-dive links
js/archive.js       live wiki relay with local-cache fallback
js/app.js           Three.js scene, camera, picking, modes, main loop
js/boot.js          Three.js loader fallback chain + fault reporting
```

Load order matters only at parse time (plain scripts, shared globals); everything heavy runs
after boot. `js/app.js` is the only file that touches Three.js at load.

## Publishing

Push to `main` — GitHub Pages redeploys automatically. For a first-time setup: repo
Settings → Pages → deploy from branch → `main` / root.

## Notes

- Boot takes ~15–30 s while planet textures render (progress is shown); phones render at
  reduced resolution automatically. Hidden/background tabs keep building instead of stalling.
- The archive relay reads https://wiki.abidanarchive.com via its MediaWiki API. When the
  relay is unreachable or a page is missing, the offline cache in `data/lore.js` answers
  instead (original summaries, no wiki text).
- Voice: the Presence speaks with Kokoro-82M, a neural TTS that runs entirely in the
  browser (lazy-loaded from CDN on first interaction, ~90 MB once, then cached; skipped on
  small screens and data-saver connections). The ranked system voice covers the load window.
  Recorded narration still wins: drop audio URLs into `audioMap` in `data/lore.js` (keys
  are record ids).
- Lore in `data/records.js` follows the books and the Abidan Archive wiki: sector
  assignments (11 / 13 / 21), iteration numbers, and event records were checked against the
  wiki's "The Way and The Worlds" page. Where canon is silent the record says so rather
  than inventing detail.
- Before attaching celebrity narration or doing anything commercial, get a nod from Hidden
  Gnome — they're famously fan-friendly, but ask first.
