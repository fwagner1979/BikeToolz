# BikeToolz — Project Notes

This file is the running journal for the BikeToolz project. Written in plain English so anyone — including future Claude sessions and Fabio (FWA) — can pick up where we left off without reverse-engineering the code.

**Live site:** https://fwagner1979.github.io/BikeToolz/

## What BikeToolz is

A free website with cycling tools that don't exist (or aren't free) elsewhere. Built for FWA and the cycling community. Business model:

1. **MVP**: solid free site, ad-supported (non-intrusive).
2. **Later**: user accounts → save profiles, routes, plans. Optional paid tier removes ads and supports the project.

## How we work

- **FWA** steers product, tests, gives feedback.
- **Claude** does engineering and explains changes in plain English.
- We update this file at meaningful checkpoints (end of session, after a decision, after a fix lands) — not after every chat turn.

## Hard rules (don't break these)

- **Site is offered in 4 languages: English, German, Spanish, Portuguese.** Any change that touches user-visible text MUST update all four `lang/*.json` files in the same change. FWA and Claude converse in English; that does not exempt a change from translation. If a translation is uncertain, flag it in `CLAUDE.md` rather than skipping it.

## MVP scope (Path A — chosen 2026-04-25)

Polish what's already built, then publish. Build the Route Planner *after* launch.

In MVP:
- **Climb Planner** — fix issues (see Open issues), ship.
- **CP/W' Analyzer** — review, polish, add user-specified-duration mode.
- **Per-tool URLs / SEO architecture refactor** — escape the iframe; each tool gets its own URL. (Moved into MVP 2026-04-25 — see Decisions log for rationale.)
- **i18n coverage pass** — translate Climb Planner, CP/W' Analyzer, and Climb Calculator-Enhanced into all 4 languages.
- **Site-wide polish** — flag rendering on Windows (Twemoji), responsive layout, hide ad placeholders, README, branch hygiene, delete orphaned calculators.

Post-MVP:
- **Route Planner** — whole-route pacing across climbs, descents, and flats. Distinct from Climb Planner; both will coexist.
- **Fitness Analyzer expansion** — FTP, durability, HR drift, etc.
- **Accounts + paid ad-free tier**.
- **Real FIT file parsing** (Garmin's native binary format).

## Current state (as of 2026-04-25)

**Status:** Discovery and walkthrough complete. Issue list and design questions captured below. **Next: draft a phased MVP work plan** (deferred to a fresh session for token-budget reasons).

- Live site is deployed from branch `claude/work-on-project-011CUiuYZ74t5aLmZuvB5NKk` ⚠️ — needs to move to a stable branch. Agent-named branches risk being force-pushed.
- `main` branch is empty/stale. Will receive `CLAUDE.md` only initially; full code promotion is part of MVP work.
- Three remote branches exist (`claude/continue-cycling-website-…`, `claude/continue-previous-project-…`, `claude/work-on-project-…`). The third is the most recent and is the one currently published.
- No PRs, no test suite, README.md is a stub.
- Stack: vanilla HTML/CSS/JS, no framework. Architecture: `index.html` hosts an iframe; tool pages render inside it. i18n via `js/i18n.js` + `lang/{en,de,es,pt}.json`. Light/dark mode. AdSense scaffolding present (not yet active).
- Local clone: `C:\Users\fwa\OneDrive - Eurowind Energy\AI\Cowork playground\Projects\BikeToolz`.
- GitHub access via `gh` CLI (`C:\Program Files\GitHub CLI\gh.exe`), authenticated as `fwagner1979`.

## Next session — start here

1. Read this file end to end.
2. Confirm with FWA that nothing has changed since the previous session's checkpoint.
3. **Draft a phased MVP work plan** (3–5 phases) covering everything in "MVP scope" + "Open issues." The plan should:
   - Order work to avoid wasted effort (e.g. set up branch hygiene & per-tool URLs *before* the i18n pass, so we don't translate strings that are about to move pages).
   - For each phase: a one-sentence goal, the issues it covers, and a rough size (S/M/L).
   - Identify the **first phase** clearly so FWA can approve and we can start.
4. Save the plan into this file under a new "## MVP work plan" heading.
5. Wait for FWA's approval before doing any code changes.
6. Branch hygiene comes first when implementation begins: tidy `main`, re-point GitHub Pages, create a feature branch off `main` for MVP work. Do not push to the current deploy branch directly.

## Open issues (master list)

### Climb Planner

1. **Average-grade-only calculation.** Tool shows avg and max grade (e.g. 7.7% avg, 12.1% max) but the power calculation only uses the average. A user with enough power for the average might not have enough for the steepest section, with no warning.
2. **Over-segmentation of long routes.** On a 134 km alpine route with 2 obvious mountain massifs, the tool detects 15 climbs (a human would say 2, or 6–7 if splitting at minor descents). Current detection (Garmin-style: 3% min grade, 500m min length) is too granular for long climbs with rolling terrain.
   - **Proposed direction**: interactive elevation chart at the top of the page. Two draggable cursors set climb start/end. Tool auto-suggests inflection points; user can accept, adjust, or override. Possibly a "macro vs detailed" preset to pre-fill cursors.
3. **Metric/Imperial toggle does nothing after GPX upload.** Distance stays in km, elevation in m. Imperial cycling units = miles + feet (grade is a ratio so unchanged). Toggle must re-render parsed GPX summary, all displayed numbers, and result outputs.
4. **`tools/climb-planner.html` is not internationalized.** Zero i18n references — all UI strings are hardcoded English. Language switcher does nothing on this page. (See site-wide i18n issue.)
5. **Step 2 ("Your Power Capability") framing needs work** — see "Open design questions" below.

### Open design questions

- **Climb Planner — Step 2 power inputs.** Three options: Simple Power / CP-W' / Power Curve. After domain review with FWA:
  - **Three options are physiologically justified** — *not* mathematically redundant. CP and FTP are theoretical 30–60 min ceilings; field-tested riders fade earlier. For long climbs (e.g. Stelvio at >60 min for an average rider), CP/FTP-derived sustainable power overestimates. The Power Curve option lets the user read off their own historical best for the climb's actual expected duration, which is more accurate than extrapolating CP/W'.
  - **Keep all three.** The fix is framing + smart defaults, not collapsing options.
  - **Smart default**: estimate climb duration *first* (from selected climb + a rough power guess or rider's prior selection), then default to the appropriate method:
    - Estimated <40 min → CP/W' Model
    - Estimated 40–60 min → either CP/W' or curve, recommend curve
    - Estimated >60 min → Power Curve
    - Always allow manual override.
  - **Copy improvements**: the current "Recommended for climbs <40 min" / "For climbs >40 min" labels are good but the *why* isn't explained. Add a short explanation accessible via tooltip / info icon.
  - **FTP**: still useful to accept as input *for the Simple Power option* (just rename to "Sustainable Power (FTP)" or similar) — recognized name, no claim of long-climb accuracy.
  - **No-power-meter path**: out of scope. Tool requires power data. State this clearly in tool intro so HR-only riders aren't confused.

### CP/W' Analyzer
1. **`.FIT` files claimed but not supported.** UI advertises "Supports .FIT, .TCX, .CSV, .GPX" but the parser throws "FIT file parsing not yet supported." **Decision (FWA, 2026-04-25): drop the FIT claim for MVP.** Remove `.fit` from the file picker `accept` attribute and update the help text. Real FIT support is a post-MVP enhancement (Garmin's native format — would need a JS library like `easy-fit` / `fit-file-parser`).
2. **Effort auto-detection is working well per FWA's test** (8 efforts found, 5 correctly flagged as high-variability, 3 correctly identified as single efforts). After heavy Oct-31/Nov-1 iteration, this is the sharpest part of the analyzer. **Leave the auto-detection algorithm alone.**
   - **Enhancement (MVP-worthy)**: alongside auto-detection, add a "user-specified duration" mode. User enters a duration (e.g. 3:15) and the tool finds the best window of exactly that length in the uploaded file(s), then runs the same CV/threshold checks and returns the page's opinion on whether the interval is valid. UX: a small "I know my effort duration" alternative input next to / under the auto-detect button.
   - Future small polish (defer): explain *why* an auto-flagged effort was flagged (which CV value, against what threshold), allow manual re-include.
3. **Layout doesn't adapt to viewport width.** Container is `max-width: 1400px` with only one breakpoint at 768px. Between 769–1399px and on ultrawide, things sit in a fixed-feeling window with no graceful reflow. Needs proper responsive breakpoints + likely a chart wrapper that reflows.
4. **Page is essentially English-only** (1 i18n reference). Needs full translation pass for en/de/es/pt.

### Site-wide
- **i18n coverage gap (major)**: only `index.html` and the older `tools/climb-calculator.html` are translated. The two newest tools (Climb Planner, CP/W' Analyzer) and the enhanced calculator are partially or entirely English-only. Translation pass needed before launch.
- **Flag emoji broken on Windows desktop.** Language selector uses real flag emoji (🇬🇧 🇩🇪 🇧🇷 🇪🇸). Windows doesn't ship with flag glyphs, so users see the underlying regional letters ("GB", "DE", "BR", "ES"). Mobile and other OSes render fine. **Fix**: include Twemoji (one `<script>` tag) — auto-replaces all emoji with platform-independent images.
- **Ad placeholders should be hidden pre-launch.** Architecture note: `index.html` hosts an iframe (`toolFrame`); tool HTML loads into that frame while the homepage chrome (and its 5 ad slots) stays in view. So ads ARE visible during tool use — the placement isn't structurally wrong as previously noted. **The real issue**: empty placeholders serve no purpose yet. AdSense requires real traffic + approval; until then the dashed-border boxes just signal "site is unfinished." **Decision (FWA, 2026-04-25)**: hide the placeholders now (`display: none` or remove from DOM); keep CSS classes/slots for later; enable real ads only after launch + AdSense approval. Add a small "Ad-supported / future ad-free paid plan" note for transparency once ads go live.
- **Orphaned calculators — DELETE.** `tools/climb-calculator.html` (manual-only predecessor) and `tools/climb-calculator-enhanced.html` (GPX-only predecessor) are both fully subsumed by today's Climb Planner. Confirmed dead weight. Action: delete the two files + remove any references in language files / nav.
- **Per-tool URLs (MVP)**: today's iframe architecture means only the homepage has its own URL — every tool loads inside `index.html`. SEO sees one page; ad inventory only counts one page view per visit no matter how many tools the user opens. Refactor so the homepage links navigate directly to `tools/climb-planner.html` etc., each tool page carries its own header/footer/ad slots, and the iframe is retired. Implication for ordering: do this *before* the i18n pass and the Twemoji/ad-hide changes, so those changes apply to the final page structure.
- Move publishing off the Claude agent branch onto `main` (or a dedicated `live` branch) and re-point GitHub Pages.
- README.md is a single line — needs a real description before the site goes wide.

## Decisions log

- **2026-04-25** — Path A: polish & publish first, route planner after launch. Climb Planner stays in MVP.
- **2026-04-25** — Cloned repo locally at the path above for development.
- **2026-04-25** — Documentation lives in this file (`CLAUDE.md`), updated at meaningful checkpoints (not after every chat turn).
- **2026-04-25** — Site is offered in 4 languages (en/de/es/pt) — every user-visible change must update all 4 `lang/*.json` files in the same change (Hard rule).
- **2026-04-25** — Drop `.FIT` file support claim from MVP UI; keep real FIT parsing as a post-MVP enhancement.
- **2026-04-25** — Climb Planner Step 2 keeps all three power-input options (Simple / CP-W' / Power Curve). They are physiologically distinct, not mathematically redundant: CP and FTP are 30–60 min ceilings, so Power Curve is genuinely needed for long climbs (>60 min). Fix is framing + smart duration-based defaults, not collapsing options.
- **2026-04-25** — Climb Planner power input: no path for riders without a power meter (HR/RPE) in MVP. State this clearly in tool intro.
- **2026-04-25** — CP/W' Analyzer: leave the auto-detection algorithm alone (it's working well per FWA's test). Add a "user-specified duration" mode as a complementary input for users who know what effort they did.
- **2026-04-25** — Delete the two orphaned older calculators (`tools/climb-calculator.html`, `tools/climb-calculator-enhanced.html`) — fully subsumed by Climb Planner.
- **2026-04-25** — Hide ad placeholders pre-launch (keep CSS classes/slots for later). Apply for AdSense only after launch + traffic.
- **2026-04-25** — **Per-tool URLs moved into MVP scope.** Original plan was post-MVP. Reasoning: (a) SEO traffic depends on per-URL ranking — one URL can't rank for "climb calculator" AND "critical power calculator"; (b) ad revenue is per page view, and the iframe architecture caps a session at 1 page view regardless of tool usage. Launching with the wrong architecture means SEO authority builds on URLs that get abandoned later. Better to ship right.
- **2026-04-25** — When implementation begins, FWA wants high-level explanations in plain English, not diffs (FWA is not a programmer).

## For future Claude sessions

1. **Read this file first.**
2. Live code is on the branch named under "Current state" — don't assume `main` is current.
3. Don't push directly to the deploy branch — work on a feature branch and ask FWA before merging.
4. At the end of each session, update **Current state**, append to **Open issues**, and add a line to **Decisions log** for any choice worth remembering.
5. FWA is not a programmer. Explain changes at a high level, in plain English. Don't dump diffs unless asked.
6. Hard rules (top of file) are non-negotiable — particularly the i18n rule: any user-visible string change must update all 4 `lang/*.json` files in the same change.
7. Use `gh` CLI for GitHub interactions: `C:\Program Files\GitHub CLI\gh.exe` (already authenticated as `fwagner1979`).
