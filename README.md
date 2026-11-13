# Milk's Gift Planner

A to-do list for gift shopping, so nobody gets forgotten.

- **Events** ("Christmas 2026") with an optional date countdown and total budget.
- **People in each event**, each with an optional budget. See at a glance who's covered and who still needs a gift.
- **Gifts for each person**: ideas you're considering (price, store, links), then **Bought** (what you paid comes off the
  budget), **Wrapped** and **Given**. Tap a gift's tag to move it along. "Where I hid it" for bought gifts, and small notes.
- **Shopping**: every idea across your events grouped by store, plus what's still to wrap (with where it's hidden) and to give.
- **People**: family tags (group an event by family), birthdays, sizes and an idea jar. People carry across events.
- **Your own order**: drag families (e.g. your own family first) and stores (the order you shop) into place.
- **Duplicate** an event to start the next one exactly as it is.
- **Paste a Gift List**: paste a list shared from [Milk's Gift List](https://milkneggs.github.io/milksgiftlist/) into a
  person and its gifts become ideas (gifts someone else is getting are left unticked).
- **Kid-safe mode** (off by default, in Settings) blurs gift names until you tap 👁.

Everything is stored on the device (IndexedDB). It works offline once opened, and installs to the Home Screen.
Settings → Export backup moves everything to another device.

## Develop

```
npm.cmd install
npm.cmd run dev      # http://localhost:5173
npm.cmd test         # budget, duplicate and Gift List import tests
npm.cmd run build    # svelte-check + production build into dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(one-time setup: repo Settings → Pages → Source: "GitHub Actions").
