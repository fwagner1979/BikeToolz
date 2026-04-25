# BikeToolz

Free cycling tools, focused on planning and analyzing rides where existing tools either don't go or aren't free.

**Live site:** https://fwagner1979.github.io/BikeToolz/

## Tools

- **Climb Planner** — upload a route, pick a climb, enter your power capability, and get a time estimate that respects the actual gradient profile (not just the average grade).
- **CP/W' Analyzer** — upload one or more activity files; the tool finds your hardest sustained efforts and fits a Critical Power model (CP and W') to them.

## Status

Pre-launch. The site is live on GitHub Pages but still in MVP polish. The current work plan and open issues live in [CLAUDE.md](CLAUDE.md).

## Languages

English, German, Spanish, and Portuguese. Every user-visible string change is translated into all four.

## Tech

Vanilla HTML / CSS / JavaScript — no framework, no build step. Translations live in `lang/{en,de,es,pt}.json`; the i18n runtime is in `js/i18n.js`.

## Feedback

Open an issue on GitHub.
