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

## Current state (as of 2026-04-26)

**Status:** Phase 3 **Sub-commits 1 + 2 complete**. Climb Planner restructured (Sub-commit 1): Step 2 ("Rider Profile") and Step 3 ("Power for this climb") are flipped, with Step 2 collecting weight + optional FTP/CP+W' (CP+W' marked Preferred) and Step 3 picking the power method via a compact tab strip (Expected avg. / CP/W' / Power Curve). Reserve-in-the-tank control (0% / 25% / 50% / custom) drives both CP/W' and Power Curve calculations; lives inside the result section so the user can sweep reserve and watch speed/time/cadence/power-analysis update live. Result section becomes interactive after first Calculate click — every Step 3 edit re-runs the physics. Gear & Cadence merged into one card with chainring × cog dropdowns. Power Analysis rewritten as Sustainable → Drivetrain losses → Power at the wheel = Required at the wheel = Gravity + Rolling + Aero. Minimum-speed warning fires when computed climbing speed drops below ~5 km/h. Cursor chart added (Sub-commit 2): Chart.js elevation profile with two draggable cursors picks the planning segment from a parsed GPX; auto-detector ticks (Macro 250 m / Detailed 30 m descent tolerance) suggest climb bounds and snap on click; merged climbs are post-snapped to the overall peak so cursors land on the true crest; the line is gradient-coloured (blue descent → green flat → yellow → orange → red brutal) and the tooltip shows local %; a full-width zoom strip above the chart with a small overlaid Reset pill lets the user fine-tune cursor placement at higher pixel-per-km resolution. The 15-climbs-on-an-alpine-route over-segmentation problem is solved. **Next:** Phase 3 — Sub-commit 3 (steepest-section warning, time-window scan against the rider's power-duration curve, with reserve applied).

- Live site deployed from `main`. Live URLs:
  - https://fwagner1979.github.io/BikeToolz/
  - https://fwagner1979.github.io/BikeToolz/tools/climb-planner.html
  - https://fwagner1979.github.io/BikeToolz/tools/cp-analyzer.html
- Recovery tags on remote (Phase 1 era): `pre-mvp-cutover-deploy`, `pre-mvp-cutover-main`. The original deploy branch `claude/work-on-project-011CUiuYZ74t5aLmZuvB5NKk` is still untouched as a deeper backup.
- Older agent branches (`claude/continue-cycling-website-…`, `claude/continue-previous-project-…`, `claude/work-on-project-…`) still on remote — leave alone, prune post-launch.
- Phase-1 and Phase-2 feature branches (`phase-1-cleanup`, `phase-2-per-tool-urls`) are merged into `main` via fast-forward and remain on remote for audit; safe to delete. Phase-3 work continues on `phase-3-climb-planner`; Sub-commit 1 fast-forwarded into `main` 2026-04-25 (8 commits) and Sub-commit 2 fast-forwarded 2026-04-26 (6 commits: the structural cursor-chart build-out plus 5 follow-ups for cursor grip / monotonic max-grade / i18n markup fallback, gradient-coloured line + tooltip + distance-based detector, macro-endIdx + zoom strip, merged-peak snap + reset button, and the zoom-strip-overlay polish).
- Tools under `tools/`: `climb-planner.html`, `cp-analyzer.html`. Each is now a complete standalone HTML page with chrome duplicated from `index.html` (Option A — duplicate-and-discipline; if chrome design changes, edit on every page).
- `README.md` has a real description (replaces the one-line stub from Phase 1).
- No PRs in flight, no test suite.
- Stack: vanilla HTML/CSS/JS, no framework, no build step. i18n via `js/i18n.js` (now derives `lang/` base path from its own URL via `document.currentScript`) + `lang/{en,de,es,pt}.json`. Light/dark mode.
- **Persistence keys (localStorage):** `bikeToolz_theme` (`light`/`dark`), `bikeToolz_isMetric` (`'1'`/`'0'`), `bikeToolz_language` (`en`/`de`/`pt`/`es`).
- **Custom DOM events** (chrome → tool):  `bikeToolz:themechange`, `bikeToolz:unitchange`, `bikeToolz:languagechange` — dispatched on `document`. Tool code listens to these instead of the old iframe `postMessage` mechanism.
- **CSS class quirk:** `cp-analyzer.html`'s tool-internal max-width-1400 wrapper is `.analyzer-container` (renamed during Phase 2 to free up `.container` for the chrome 1200px layout). Climb Planner had no collision.
- Local clone: `C:\Users\fwa\OneDrive - Eurowind Energy\AI\Cowork playground\Projects\BikeToolz`.
- GitHub access via `gh` CLI (`C:\Program Files\GitHub CLI\gh.exe`), authenticated as `fwagner1979`.

## Next session — start here

**Sub-commits 1 + 2 of Phase 3 have landed on `main`.** Sub-commit 3 (steepest-section warning) is the next piece. Full design for all 5 sub-commits is in [`docs/phase-3-plan.md`](docs/phase-3-plan.md).

1. Read this file end to end (especially "Current state" — confirm Sub-commits 1 + 2 are landed and nothing's shifted).
2. Read [`docs/phase-3-plan.md`](docs/phase-3-plan.md) end to end, paying particular attention to **decision 1 (steepest-section warning algorithm)** since that's Sub-commit 3's spec. **Don't re-open the design questions** — they were settled in the alignment session. If something genuinely doesn't make sense once you're in the code, surface it to FWA before deviating.
3. Confirm with FWA that nothing has shifted since Sub-commit 2 merged.
4. Phase 3 work continues on the existing `phase-3-climb-planner` feature branch (already merged into `main` for Sub-commits 1 and 2 via fast-forward; the branch tip == `main` tip). Land Sub-commit 3 there, then pause for FWA review and approval before merging. Don't bundle multiple sub-commits into one push — review fidelity comes from the small-step rhythm. Expect FWA to ask for follow-ups during testing; commit those as small incremental "follow-up N" commits on the same branch (Sub-commit 1 ended up at 9 commits, Sub-commit 2 at 7 commits — that's the rhythm).
5. **i18n exception applies** for Phase 3 only, scoped to `tools/climb-planner.html` only (see plan §5). New strings introduced on that page during Phase 3 may be English-only with a `data-i18n` key; full translation pass for the page lands in Phase 5. The hard rule still applies everywhere else (chrome, other pages). `js/i18n.js` was patched during Sub-commit 2 to leave inline markup intact when a key has no translation in either the current language or English — so Phase-3-era keys degrade gracefully on DE/ES/PT instead of showing the raw key path.
6. Don't push directly to `main` for Phase 3 code changes — only for trivial checkpoint edits to this file.

### Sub-commit 3 — implementation pointers

The plan doc has the full algorithm; these are the practical hooks already available in `tools/climb-planner.html`:

- **Cursor-defined planning segment.** `getPlanningSegment()` returns `{ startIdx, endIdx, startKm, endKm, length, elevation, avgGrade, maxGrade }`. That's the segment to scan. `state.gpxPoints` is the underlying array of `{ lat, lon, elevation, distance }`.
- **Rider's power-duration curve.**
  - CP/W' available (Step 2 mode = `cpw` AND values entered): `getCPWInputs()` returns `{ cp, wPrime, source }`. Compute `P_max(t) = CP + W'(1 − R) / t` where `R = state.reserveFraction`. **Full mode.**
  - Power Curve (Step 3 method = `curve` with at least 3 points entered): `collectCurvePoints()` returns `[{time, power}]`; `interpolatePower(points, lookupMinutes)` reads the curve at `t / (1 − R)`. **Full mode.**
  - Otherwise (Step 3 method = `simple`, or Step 2 is FTP-only / blank): only one number is available — `state.calculatedSustainablePower`. **Degraded mode**: flag any sub-window where required power exceeds that number for ≥ 1 min.
- **Required power per window.** Pick a rolling speed (the plan suggests "use the time-estimate's pace" — see decision 1 → "Things to revisit"). Required power = `M × g × sin(arctan(grade/100)) × v + rolling + aero`. The existing `findOptimalSpeed` and the in-line physics inside `calculateClimb` are the references.
- **Window sizes.** 10 s, 30 s, 1 min, 3 min, 5 min, 10 min. For each size, slide across the segment; track the window with the largest required power. Compare to `P_max(window_duration)`. The window with the biggest positive gap is the warning.
- **Edge case: short segment.** Only scan windows ≤ segment duration. If no window exceeds capability, render a positive note ("within sustainable range across all sub-sections") instead of an alarm.
- **Where to render.** Under the time estimate / planned-power line in the result section's plan summary (after the Power Analysis is fine too — designer's call). Should auto-update via the existing `calculateClimb` live-refresh path. The `state.reserveFraction` plumbing already flows through every recompute.
- **Reserve coupling.** The same R fraction used for CP/W' / Power Curve gates the warning so it matches the rider's pacing intent (decision 1 + decision on reserve-in-the-tank).

### Known follow-ups / open issues to keep in mind

- **Cadence calculation is still numerically off** despite the Gear & Cadence card being responsive. Open issue Climb-Planner #0 has the working hypothesis. Either fix it as a small dedicated commit on the Sub-commit 3 branch (since FWA will be testing the planner end-to-end anyway) OR defer to Sub-commit 5 polish. FWA's call.
- **Phase 3 i18n keys.** Sub-commits 1 + 2 introduced many English-only `data-i18n` keys on `tools/climb-planner.html` (search the file for `data-i18n=` to enumerate). Sub-commit 5's translation pass will add EN/DE/ES/PT entries for all of them in `lang/*.json`.

## MVP work plan

Drafted 2026-04-25. Five phases, ordered to avoid wasted effort: structural changes first, then features, then translation/polish, then launch. Covers every item in **MVP scope** and **Open issues**. Sizes: S ≈ half-day to a day, M ≈ multi-day, L ≈ week-ish.

**i18n reminder (Hard rule):** every phase below that adds or changes user-visible text updates all 4 `lang/*.json` files *in the same change*. Phase 5 is the back-translation of legacy English-only strings, not a license to defer translations introduced in earlier phases.

---

### Phase 1 — Foundation & cleanup (S) **← START HERE**

**Goal:** clean baseline — code on a stable branch, dead files gone, README real, ready for feature work.

**Covers:**
- Move publishing off the Claude agent branch onto `main` (or a dedicated `live` branch — FWA picks at start of phase) and re-point GitHub Pages.
- Create a feature branch off `main` for MVP work; do not push to the deploy branch directly.
- Delete `tools/climb-calculator.html` and `tools/climb-calculator-enhanced.html`. Remove any references in `index.html`, nav, and `lang/*.json` (any keys belonging to those pages get dropped from all 4 lang files).
- Replace the single-line `README.md` with a real description: what BikeToolz is, link to live site, status, license / credit if any.

**Why first:** branch hygiene is non-negotiable per the project file, and deleting the two orphans first means we never refactor or translate code we're about to throw away.

---

### Phase 2 — Per-tool URLs / kill the iframe (M)

**Goal:** each tool is its own real page with its own URL, header/footer, language switcher, dark-mode toggle, and ad slots. Homepage links navigate directly to `tools/climb-planner.html` etc. The `toolFrame` iframe is retired.

**Covers:**
- Site-wide: per-tool URLs refactor (the architectural item promoted into MVP on 2026-04-25).
- Site-wide: site chrome — header, language switcher, theme toggle, footer, ad-slot containers — factored into a shared snippet that every tool page loads. Each tool page renders its own tool below the chrome.
- Homepage tool cards become real `<a href>` links instead of iframe loaders.

**Why second:** every later change (translations, Twemoji, ad-placeholder hide, responsive polish) needs the final page structure to land on. Doing them earlier means redoing them.

---

### Phase 3 — Climb Planner: fixes + draggable-cursor chart (L)

> **Design aligned 2026-04-25 — see [`docs/phase-3-plan.md`](docs/phase-3-plan.md) for the full plan, all settled design decisions, and the 5-sub-commit implementation order. Read that file before coding Phase 3.**

**Goal:** Climb Planner is honest and usable end-to-end, including on long alpine GPX files where it currently shreds a 2-massif route into 15 segments.

**Covers (all 5 Climb Planner issues + Step 2 design):**
1. **Average-grade-only calculation.** Surface the steepest section explicitly — e.g. "you'll need X W to clear the steepest 500m at Y% — your selected power gives you Z." Avg-grade headline number stays; user isn't blindsided by ramps.
2. **Over-segmentation — interactive elevation chart with draggable cursors.** Chart at top of page after GPX upload. Two cursors set climb start / end. Tool pre-suggests inflection points (with a "macro vs detailed" preset). User can accept, drag, or override. All downstream calculations use the cursor-defined segment.
3. **Metric / Imperial toggle re-renders after GPX upload.** Toggle repaints parsed GPX summary, displayed numbers, and result outputs. km ↔ miles, m ↔ feet; grade unchanged (it's a ratio).
4. **Full i18n on `tools/climb-planner.html`.** Replace every hardcoded string with a `data-i18n` key; populate keys in all 4 lang files in the same change. The page is being rewritten anyway, so this lands cleanly inside Phase 3 rather than waiting for Phase 5.
5. **Step 2 ("Your Power Capability") framing.**
   - Estimate climb duration first, then default the Power input method: CP/W' for <40 min, recommend Power Curve for 40–60 min, Power Curve for >60 min. Always allow manual override.
   - Rename Simple Power input to "Sustainable Power (FTP)" or similar.
   - Tooltip / info icon explaining *why* each method fits which climb length.
   - Tool intro line stating the tool needs power data — HR-only / no-meter riders are out of scope for MVP.

**Note on size:** the cursor chart is the heaviest single item in the MVP. If a charting library is needed (e.g. Chart.js), we'll keep it small and load it only on this page.

---

### Phase 4 — CP/W' Analyzer: fixes + user-duration mode (M)

**Goal:** Analyzer doesn't make claims it can't keep, has a manual-entry path for users who already know their effort duration, and reflows on every viewport.

**Covers (all 4 Analyzer issues):**
1. **Drop the `.FIT` claim.** Remove `.fit` from the file picker `accept` attribute; update help text to "Supports .TCX, .CSV, .GPX." Real FIT parsing remains post-MVP.
2. **User-specified duration mode.** Small alternative input near the auto-detect button: "I know my effort duration." User enters e.g. `3:15`; tool finds the best window of that exact length in the uploaded file(s) and runs the same CV / threshold checks. The auto-detection algorithm itself is *not* touched — confirmed working well per FWA's test.
3. **Responsive layout.** Add breakpoints between 769–1399 px and a sensible ultrawide cap. Wrap the charts so they reflow rather than sitting in a fixed-width-feeling window.
4. **Full i18n on `tools/cp-analyzer.html`.** Same approach as Climb Planner — `data-i18n` keys + all 4 lang files in the same change.

---

### Phase 5 — Site-wide polish, final translation sweep, launch (M)

**Goal:** site is launch-ready: flags render on Windows, no orphan ad boxes signalling "unfinished," every page complete in all four languages, README solid, publishing on a stable branch, final QA done.

**Covers:**
- **Twemoji.** Add the one `<script>` tag (CDN) so language-switcher flags render the same on Windows desktop as on mobile / macOS.
- **Hide ad placeholders.** `display: none` (or remove from DOM); keep CSS classes / slot IDs so re-enabling is a one-line change after AdSense approval. Stage a short "ad-supported / future ad-free paid plan" footer note (kept hidden until ads go live).
- **Final i18n sweep.** Walk every page and confirm every user-visible string is keyed and translated in all 4 lang files. Catch any leakage from earlier phases.
- **Final QA.** Every tool in en / de / es / pt × light + dark mode × three viewport widths (mobile, mid-desktop, ultrawide). Real GPX upload smoke test on Climb Planner; real file upload smoke test on Analyzer.
- **Branch / publishing handoff.** Confirm GitHub Pages serves from `main` (or `live`) and the agent branch is no longer the source of truth. Tag the launch commit.

---

### Out of MVP (recap, so it doesn't creep in)

Route Planner (whole-route pacing), Fitness Analyzer expansion (FTP / durability / HR drift), accounts + paid ad-free tier, real `.FIT` binary parsing, no-power-meter (HR / RPE) path on Climb Planner, "explain *why* an effort was flagged" UI on the Analyzer.

---

**Approval needed on this plan — and specifically on Phase 1 — before any code changes.** Once approved, we ship Phase 1, re-confirm, then proceed phase by phase.

## Open issues (master list)

### Climb Planner

0. **Cadence calculation is still off (deferred — known issue post-Sub-commit 1).** After Phase 3 / Sub-commit 1, the Gear & Cadence card responds to changes in speed and gear (auto-refresh works, dropdown selections persist), but the actual cadence number FWA observes during testing doesn't fully match what he'd expect from `cadence = (speed_in_m_per_s × 60 / wheel_circumference_m) / (chainring / cog)`. Likely a unit / rounding / formula-step mismatch somewhere in `findOptimalGear` (which currently does the math) or in `renderGearCadenceReadout`. Decision: ship Sub-commit 1 anyway since the broader UX is a clear win; revisit when picking up Sub-commit 2 or in Sub-commit 5 polish, with a numeric worked example from FWA showing the expected vs displayed cadence so the next session can pinpoint the discrepancy fast.

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
- **2026-04-25** — **Phase 1 cutover complete.** GitHub Pages now serves from `main` (was `claude/work-on-project-011CUiuYZ74t5aLmZuvB5NKk`). Old deploy branch retained as backup. Recovery tags `pre-mvp-cutover-deploy` and `pre-mvp-cutover-main` pushed for rollback. Orphans deleted (`tools/climb-calculator.html`, `tools/climb-calculator-enhanced.html`, `test-climb-calculator.html`, and the stale generic git cheat sheet `ROLLBACK-GUIDE.md`). `README.md` rewritten from one-line stub to real description.
- **2026-04-25** — Single-maintainer workflow agreed: feature branch → push → FWA reviews summary in plain English → fast-forward merge to `main`. No PR ceremony required; the audit trail lives in commit messages.
- **2026-04-25** — **Phase 2 cutover complete.** Per-tool URLs live on the production site. Each tool page is now a complete standalone HTML file with chrome (header / nav / footer / ads / language / theme / units / mobile menu) duplicated from `index.html`. Iframe architecture retired. Theme + unit choices now persist across page navigation via localStorage (`bikeToolz_theme`, `bikeToolz_isMetric`); language was already persisted. Tool-side code that previously listened to `postMessage` from the parent frame now listens to `bikeToolz:themechange` / `bikeToolz:unitchange` / `bikeToolz:languagechange` custom DOM events on `document`.
- **2026-04-25** — **Naming decision: keep `tools/cp-analyzer.html` URL** rather than renaming to e.g. `fitness-analyzer`. Reasoning: SEO authority is per-URL; future post-MVP analyzers (FTP estimator, HR drift, durability) get their own sibling URLs (`tools/ftp-estimator.html` etc.) so each can rank for its own keyword cluster. One growing mega-tool would have diluted SEO across mismatched search intents. Implication: when each new analyzer ships, it gets its own URL + its own page.
- **2026-04-25** — **Chrome architecture: Option A (duplicate-and-discipline).** HTML chrome, chrome CSS, and chrome JS are all duplicated verbatim into each page (`index.html`, `tools/climb-planner.html`, `tools/cp-analyzer.html`). If chrome design changes, all three pages must be edited together. Picked over JS-injected partials (would hurt SEO — defeats the point of the URL refactor) and a build step (overkill at 3 pages, contradicts the project's "no build step" stack discipline). Revisit if pages reach ~6+.
- **2026-04-25** — **Future-tools UX flag (post-MVP, not blocking):** when sibling analyzers ship (FTP estimator, HR drift, etc.), users will have to re-upload ride files for each tool. Solvable later with sessionStorage hand-off + a "see this same data in &lt;sibling&gt; →" link. Not in MVP scope; flagged so it's on the radar.
- **2026-04-26** — **Phase 3 / Sub-commit 2 landed on `main`.** Six commits fast-forwarded from `phase-3-climb-planner`. Cursor chart replaces the Detected-Climbs dropdown: Chart.js v4.4.0 elevation profile with two draggable HTML cursors (pointer events for unified mouse + touch); auto-detector refactored to a distance-based 200 m trailing window for consistent detection across GPX point densities; Macro (250 m descent tolerance) / Detailed (30 m) tick suggestions on the chart axis with click-to-snap; per-segment gradient colouring on the line + fill (blue → green → yellow → orange → red) and a gradient line in the tooltip; full-width zoom strip above the chart with a small overlaid Reset pill that lets the user fine-tune cursor placement at higher pixel-per-km resolution; minimum 200 m / 1 % zoom span enforced so handles can't collapse. Merged climbs in Macro mode are double-snapped to the overall peak (per-raw-snap before merging plus a post-merge full-range snap) so cursors land on the true crest even when the merged span includes a high early peak followed by a smaller secondary bump. Generic chrome fix: `js/i18n.js` now leaves the inline markup text intact when a key is missing in both the current language and English (instead of overwriting with the raw key path) — Phase 3's English-only-strings exception now degrades gracefully on DE/ES/PT instead of showing `climbPlanner.step2.title` etc. on the live site. The 15-climbs-on-an-alpine-route over-segmentation that motivated Phase 3 is resolved. Bottom-cursor segment is the source of truth via `getPlanningSegment()`; `state.selectedClimb` is mirrored from it for back-compat with the existing calculation code paths. Max-grade calculation now uses a distance-based 100 m sliding window with step=1 — guaranteed monotonic when expanding a cursor segment outward.
- **2026-04-25** — **Phase 3 / Sub-commit 1 landed on `main`.** Eight commits fast-forwarded from `phase-3-climb-planner`. Restructure highlights: Step 2/3 flip; new Rider Profile (weight + optional FTP-or-CP+W' radio with CP+W' marked Preferred); new Step 3 method picker as a compact tab strip; smart-default duration estimate that iterates with the chosen method's reserve-adjusted power; "Reserve in the tank" control (0/25/50/custom) applied to CP/W' and Power Curve; result section becomes live after the first Calculate click; gear+cadence merged into one interactive card; Power Analysis rewritten with a clear sustainable→losses→at-wheel=required flow; minimum-speed warning under ~5 km/h. Plan-doc updates captured the "CP+W' preferred" decision and the reserve-in-tank semantics so future sessions inherit the rationale. **Known follow-up:** cadence number is still not quite right per FWA's observation — see Open issues #0; deferred deliberately to ship Sub-commit 1's UX wins.
- **2026-04-25** — **Phase 3 design aligned.** All open design questions for the Climb Planner settled in a focused alignment session; full record in [`docs/phase-3-plan.md`](docs/phase-3-plan.md). Highlights: (a) steepest-section warning uses a **time-window scan** comparing required power to the rider's power-duration curve (full mode with CP+W'/Power Curve, degraded mode with Simple Power only), not a fixed-distance window; (b) Steps 2 and 3 **flip** — new Step 2 is "Rider Profile" (weight + optional FTP-or-CP+W' radio), new Step 3 is "Power for this climb" with the smart default driven by Step 2 inputs; (c) "Simple Power" relabeled to **"Expected avg. power for this climb"** — its semantic stays a gut-feel sustainable-for-this-climb number, not FTP; (d) cursor chart is **Chart.js + custom HTML cursor overlays**, with auto-detected climbs surfaced as **clickable ticks on the chart axis** (not a dropdown), and a Macro / Detailed toggle controlling the auto-detector's descent tolerance; (e) **i18n exception** for Phase 3 — `tools/climb-planner.html` may receive English-only new strings; full translation deferred to Phase 5. Plan covers 5 sub-commits in order: step flip → cursor chart → warning → units re-render → polish.

## For future Claude sessions

1. **Read this file first.**
2. Live code is on the branch named under "Current state" — don't assume `main` is current.
3. Don't push directly to the deploy branch — work on a feature branch and ask FWA before merging.
4. At the end of each session, update **Current state**, append to **Open issues**, and add a line to **Decisions log** for any choice worth remembering.
5. FWA is not a programmer. Explain changes at a high level, in plain English. Don't dump diffs unless asked.
6. Hard rules (top of file) are non-negotiable — particularly the i18n rule: any user-visible string change must update all 4 `lang/*.json` files in the same change.
7. Use `gh` CLI for GitHub interactions: `C:\Program Files\GitHub CLI\gh.exe` (already authenticated as `fwagner1979`).

### Working-style notes from the Phase 3 sessions

- **No live preview server.** FWA tests manually in a browser after every push. Don't try to spin up a Python `http.server` (the launch.json approach was denied earlier — files live in OneDrive and FWA prefers not to expose them via a network-bound port). Static verification (ID cross-check + brace balance) is the substitute. After a push, FWA hard-refreshes the live page or opens the file directly. OneDrive on-demand sync sometimes lags — if a fresh build seems to show old behaviour, the most likely cause is browser cache or OneDrive not having materialised the file yet.
- **Commit rhythm.** Each sub-commit ends up as a *family* of commits: the structural commit + several "follow-up N" commits as FWA tests and finds rough edges. Don't try to land a sub-commit in one commit — small follow-ups are cheaper to review and easier to revert. Sub-commit 1 = 9 commits, Sub-commit 2 = 7. Plan for similar.
- **Static verification before every commit.** A short `python` one-liner that grep-counts braces / parens / brackets and cross-checks `getElementById` IDs against the markup catches >90% of the typos that would otherwise survive into FWA's testing. The pattern lives in this conversation's history; reuse it.
- **Auto mode.** FWA usually toggles `/auto` on so I keep moving without prompting on every step. Still pause for: (a) merging to `main`, (b) destructive git operations, (c) actions FWA hasn't authorised in advance.
- **Plain-English summaries.** After every push, FWA expects a "what changed (in plain English)" + "test plan" block. Keep the language non-technical; the user is steering product, not reviewing diffs.
- **Math accuracy matters.** FWA is a strong domain expert (cyclist, knows CP/W', knows what a paced 3-min PR looks like). When numbers don't match physical intuition, take the report seriously and trace through the math by hand before defending the code. The 3-min/5-min/12-min PR fit producing CP=263 / W'=18.3 was a useful worked example; reuse that style of trace if the discussion turns numerical again.

### Where the Climb Planner code lives

- `tools/climb-planner.html` — single-file tool, ~3700 lines. Sections in order: chrome CSS + tool CSS, chrome HTML, Step 1 / 2 / 3 markup, result section markup, chrome JS (IIFE), tool JS.
- Tool JS top-level state object (`let state`) is the source of truth for everything: cursor segment, gpxPoints, calculatedSustainablePower, reserveFraction, resultsVisible, lastResult, zoom range, etc. Document any new state additions when you add them.
- `getPlanningSegment()` returns the cursor-defined segment; everything downstream reads from it (or from `state.selectedClimb` which mirrors it).
- `updatePowerCalculations()` is the central recompute function. It re-renders the Step 3 banner and (when `state.resultsVisible`) re-runs `calculateClimb(silent=true)` for live results. Wire any new live-update behaviour into this path rather than adding ad-hoc listeners.
- `calculateClimb(silent)` is both the manual button handler (silent=false, shows alerts) and the auto-refresh path (silent=true, returns quietly on incomplete inputs). Don't break the silent contract — it's load-bearing.
- `js/i18n.js` was patched during Sub-commit 2 to add a `hasTranslation(key, language)` overload and to skip the markup overwrite when a key has no translation in either the current or fallback language. Future translation work should land in `lang/*.json` and will start showing automatically.
