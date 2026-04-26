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

## Current state (as of 2026-04-26, end of second session)

**Status:** Phase 3 **Sub-commits 1 + 2 are merged to `main` and live**. **Sub-commits 3 + 4 are committed on `phase-3-climb-planner` but NOT merged to `main` yet** — 12 commits ahead of main, awaiting FWA's review/sign-off and merge. The live site still shows the post-Sub-commit-2 state until those land.

**Sub-commit 3 — Steepest-section warning (3 commits on branch)**
Time-window scan over the cursor segment at 10 s / 30 s / 1 min / 3 min / 5 min / 10 min sliding windows. For each window, computes required rider power on the local grade at the planned rolling speed and compares it to capability for that exact window duration. Capability source picks itself from Step 3:
- **CP/W'** mode → `P_max(t) = CP + W'(1−R)/t`. Full mode.
- **Power Curve** mode → curve looked up at `t / (1−R)`. Full mode.
- **Simple Power** mode → single-number compare for windows ≥ 60 s. Degraded mode.

The window with the biggest positive gap becomes the warning; if no window exceeds capability, a green "within sustainable range" positive note shows. Lives in the result section under the speed warning; runs on the existing `calculateClimb` live-refresh path. Speed iterated from planned power on the segment's avg grade (per FWA's call — power changes coherently propagate to speed → cadence). Reserve-aware throughout. Two follow-ups added (a) red-border + auto-scroll highlights on missing required fields when Calculate fails validation and (b) single-pass validation that marks *every* missing field at once across all four checks (Climb data, Power capability, Rider & equipment, Gearing) instead of bailing at the first failure.

**Sub-commit 4 — Sector-by-sector ride plan with W'bal simulation (9 commits on branch)**
Where Sub-commit 3 surfaced the problem, Sub-commit 4 solves it: replace the warning with a per-sector breakdown when the rider has CP/W' (or a Power Curve we can fit CP/W' from). Renders a table of sectors below the steepest-section warning area; the legacy single-block result cards (Climbing Speed / Climb Time / Gear & Cadence) hide themselves when the breakdown is up (they were duplication of the Total row). Power Analysis stays. Reserve in the tank moved to the top of the result section so it reads as the dial that drives everything below.

The model that emerged after testing (8 follow-ups of refinement):

1. **Tier-based classifier with asymmetric merging.** Each smoothed-grade GPX point is classified into one of six tiers (Descent / Easy / Manageable / Hard / Steep / Brutal) by `tierForGrade(grade)` with strict-< boundaries — `< 0%`, `< 3%`, `< 7%`, `< 10%`, `< 16%`, `≥ 16%`. The pacing-Hard flag is *derived* from the tier (≥ Hard means above-CP allocation). Asymmetric merging: Hard / Steep / Brutal runs always survive (only the absolute floor filters pure noise); Descent / Easy / Manageable runs shorter than `MIN_SECTOR_SECONDS` get absorbed into the previous run.

2. **Smooth M(g) steepness multiplier.** `M(g) = 2^((g − 7) / 4)` — doubles every 4 grade-points beyond the 7 % reference. M(7%)=1, M(10%)≈1.68, M(13%)≈2.83, M(15%)=4, M(18%)≈6.73. Smooth, no band cliffs. The reference and doubling step live as named constants (`MG_GRADE_REFERENCE_PCT`, `MG_DOUBLING_GRADE_PCT`) for retuning.

3. **Global excess allocation.** `excess_W = W'(1−R) / Σ(M(grade_i) × duration_i)` over hard sectors, then each hard sector's excess = `M(grade_i) × base_excess`. Allocates W' *once* across the whole climb (not once per sector — that bug in the first run produced impossible 1845 W / 3057 W cells). Per-sector ceiling = `W'(1−R) / sector_duration_i` so a short sector's excess can't claim more than the rider could spend if it were the only sector; if a sector caps, residual gets redistributed to the others. Outer loop iterates 2-3 passes because durations depend on excesses depend on durations.

4. **Easy-sector pacing with floor.** `power = clamp(required-at-planned-speed-on-max-100m, tier_floor, CP)`. Floors per tier: Descent → 0 % CP (coast), Easy (< 3 %) → 60 % CP, Manageable+ → 67 % CP. The max-100 m representative grade means a 3.3 %-avg sector with an 8.4 % spike is paced for the 8.4 % spike, not the 3.3 % avg.

5. **Point-by-point integration.** `integrateSectorAtPower(sector, points, power, mass, eff)` walks every GPX segment inside a sector, solving speed at the constant rider power on each segment's local grade, accumulating time = Σ (length_i / v_i). Returns `{timeSec, avgSpeedMs, minSpeedMs}`. The sector's displayed time and avg speed reflect the actual ride; min speed is what drives the displayed cadence.

6. **W'bal forward simulation (Skiba).** `simulateWBal()` walks the per-sector pacing in 1-second steps:
   - **Above CP:** `W'bal -= (P − CP) · dt` (linear depletion, zero rate exactly at CP).
   - **Below CP:** Skiba's exponential recovery `W'bal += (W' − W'bal) · (dt / τ) · gate`, where `τ = 546·exp(−0.01·DCP) + 316` and the recovery gate `min(DCP / 30, 1)` ramps from 0 at exactly CP up to full Skiba over the first 30 W below — fixes the "recovers at CP" artefact of the literal Skiba model.
   - Tracks `minWbal` and which sector first breaches the `W' × R` reserve floor.

7. **Power Curve → CP/W' fit.** `fitCPWFromCurve(points)` does a 2-parameter linear regression on the linearised `P = CP + W'/t` (works on 1/t vs P). Sanity-rejects fits with CP < 30 W or W' < 1 kJ. So Power Curve mode feeds the same physiology pipeline as direct CP/W' input; footer shows a "(fitted)" tag.

8. **Detail-level slider — display lens, plan invariant.** State: `state.sectorDetailLevel` (1..5, default 3). The slider does **not** change the underlying plan. The classifier always runs at the fixed `GROUND_TRUTH_PRESET` (smoothing ±50 m, no merge thresholds → all distinct tier-runs survive); pacing + W'bal sim run on those ground-truth sectors. The slider then *bundles* adjacent ground-truth sectors into display rows per the level's `minSubHardSec` + `hardMinMeters` thresholds. Bundle aggregates: time-weighted avg power `Σ(P·t)/Σ(t)`, sums for length / time / elevation, max-of-maxes for the steepest 100-m peak, first/last component's W'bal for start/end. **Total time, avg power, NP, and end W'bal are invariant across slider levels by construction.** Aggregated bundles show "—" for Gear · low RPM (gear isn't a single number across mixed-power components).

9. **Normalized Power column.** Coggan formula: per-second power timeline → 30-second rolling avg → mean of 4th powers → 4th root. Single-component bundles show NP = avg; aggregated bundles show NP > avg whenever power varies inside the bundle. Total NP is computed off the ground-truth array directly (so it's stable across slider levels too).

10. **Lowest-cadence display.** Per-sector min speed (tracked in the integrator) gives the cadence the rider sees in the picked gear at the steepest sub-bit. Header is "Gear · low RPM". Gear is still picked at the sector's avg speed for stable gear choice.

11. **`findOptimalSpeed` rewritten with bisection.** The old Newton-Raphson got trapped at the v=0.5 m/s floor on descents because the demand curve P_required(v) is non-monotonic at low v on negative grades — derivative changes sign so a positive power-deficit produced negative speed adjustments. New bisection in `[0.5, auto-expanded hi]` is bracket-and-monotonic in the relevant region; speed cap raised from 15 to 50 m/s so real descents (60+ km/h) aren't artificially clipped.

The sector breakdown is hidden when (a) Simple Power mode is active (no W'bal model), (b) manual climb input is used (no per-point profile), or (c) the climb has no Hard+ tier sectors at all. In those cases the legacy result cards reappear and (a) falls back to the steepest-section warning.

**Next:** FWA test/review/merge for Sub-commits 3 + 4. After that, Sub-commit 5 (polish + i18n translation pass + tooltips on Step 3 method picker) is the remaining piece of Phase 3.

- Live site still served from `main` (showing the post-Sub-commit-2 state until SC3+SC4 merge):
  - https://fwagner1979.github.io/BikeToolz/
  - https://fwagner1979.github.io/BikeToolz/tools/climb-planner.html
  - https://fwagner1979.github.io/BikeToolz/tools/cp-analyzer.html
- Recovery tags on remote (Phase 1 era): `pre-mvp-cutover-deploy`, `pre-mvp-cutover-main`. The original deploy branch `claude/work-on-project-011CUiuYZ74t5aLmZuvB5NKk` is still untouched as a deeper backup.
- Older agent branches (`claude/continue-cycling-website-…`, `claude/continue-previous-project-…`, `claude/work-on-project-…`) still on remote — leave alone, prune post-launch.
- Phase-1 and Phase-2 feature branches (`phase-1-cleanup`, `phase-2-per-tool-urls`) are merged into `main` via fast-forward and remain on remote for audit; safe to delete. Phase-3 work continues on `phase-3-climb-planner`; Sub-commit 1 fast-forwarded into `main` 2026-04-25 (8 commits) and Sub-commit 2 fast-forwarded 2026-04-26 (6 commits). Sub-commits 3 + 4 are queued on the branch (12 commits ahead of `main` as of end-of-session: 5480ad8 SC3, 1910e6b SC3-fu1, 7f61f3f SC3-fu2, b03c3a5 SC4, ab83647 SC4-fu1, f9aaa6c SC4-fu2, 9fcceb4 SC4-fu3, 32b9912 SC4-fu4, 773327b SC4-fu5, 68b3485 SC4-fu6, 55d310b SC4-fu7, 9810732 SC4-fu8) — not merged.
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

**Sub-commits 3 and 4 of Phase 3 are committed on `phase-3-climb-planner` but not yet merged to `main`.** They sit waiting for FWA's testing pass + sign-off. The branch is 12 commits ahead of `main`.

There are two natural starting points depending on what FWA wants:

**A) Test → merge → Sub-commit 5.** FWA finishes testing the per-sector breakdown on real GPX, gives the OK, the branch fast-forwards into `main`, the live site updates, then we move to Sub-commit 5 (polish + i18n translation pass for Phase 3's English-only data-i18n keys + tooltips on Step 3 method picker). This is the happy path.

**B) Continue refining Sub-commit 4.** FWA flagged several things during testing that he didn't push for change at session end but said "could still be improved":
   - The cadence calc on the legacy single-block result card is still numerically off (deferred from Sub-commit 1 → Open Issue Climb-Planner #0). Now that the breakdown shows per-sector cadence, the legacy card is hidden when full mode is active, but the bug still surfaces in Simple Power and manual-input modes.
   - The detail slider could probably use a small inline note like "affects display only — total time / power are invariant" so future-FWA doesn't trip over the surprise.
   - Long+steep sectors (e.g. 21-min sustained 10 %) still get only modest excess because the duration-weighted W' allocation is unforgiving on long sections — physics, not a bug, but flagged.
   - Steepness multiplier parameters (`MG_GRADE_REFERENCE_PCT = 7`, `MG_DOUBLING_GRADE_PCT = 4`) and the easy-sector floor percents (60 / 67) are reasonable defaults but might want tuning after more real-world test rides.
   - Power Analysis section was discussed as "could be removed" but kept as additional info; might be worth revisiting once the per-sector view feels settled.

**Workflow reminders:**

1. Read this file end to end. Confirm with FWA that nothing has shifted since the end-of-session-2 state captured here.
2. Read [`docs/phase-3-plan.md`](docs/phase-3-plan.md) end to end. Sub-commit 3 + 4 implementations are now in code; the plan doc still describes the original spec. The implementation drifted thoughtfully (e.g. tier-based classifier instead of binary, smooth M(g) instead of bands, ground-truth + bundle decoupling) — those evolutions are captured in this file's Decisions log + Current state, not in `phase-3-plan.md`.
3. Phase 3 work continues on `phase-3-climb-planner`. Don't push directly to `main` for code changes. Don't bundle Sub-commit 5 into the same merge as 3+4 — let FWA fast-forward 3+4 first, then start 5 on the same branch.
4. **i18n exception applies** for Phase 3 only, scoped to `tools/climb-planner.html` only (see plan §5). New strings introduced on that page during Phase 3 may be English-only with a `data-i18n` key; full translation pass lives in Sub-commit 5.

### Sub-commit 5 — when we get there

Scope per the plan doc + accumulated needs:
- **i18n translation pass** for `tools/climb-planner.html`. Search the file for `data-i18n=` and populate every key in all four `lang/{en,de,es,pt}.json` files in the same change.
- **Tooltips** on the Step 3 method picker explaining *why* CP/W' fits short climbs and Power Curve fits long ones.
- **Refine warning copy** based on FWA's real-world test feedback.
- **Cadence Open Issue #0** if not already fixed by then. Worth checking whether the legacy gear/cadence card's cadence formula is correct when reached via Simple Power / manual-input mode (where the card actually shows).
- Final manual smoke test with a real alpine GPX (FWA-supplied) and sign-off.

### Implementation pointers — Sub-commit 4 algorithm map

The full algorithm landed across 9 commits of iteration. Key entry points in `tools/climb-planner.html`:

- **`runSectorBreakdown(speedMs, drivetrainEff, totalMassKg, plannedPowerW)`** — top-level dispatcher. Bails (and shows the legacy result cards) when manual mode, no segment, no physiology (Simple Power), or no Hard+ sectors.
- **`identifyHardSectors(seg, points, plannedPowerW, plannedSpeedMs, totalMassKg, drivetrainEff, preset)`** — tier-based classifier. Called with `GROUND_TRUTH_PRESET` for the actual plan; the slider does *not* affect this call.
- **`paceAllSectors(...)`** — orchestrates per-sector pacing. Easy sectors via `paceEasySector` (max-100m grade + tier floor + cap at CP). Hard sectors get global excess via `allocateHardExcess` (M(g) weighted with per-sector ceiling) then ride at `paceHardSector` constant power. Iterates 2-3 outer passes.
- **`integrateSectorAtPower(sector, points, power, mass, eff)`** — point-by-point integration. Returns `{timeSec, avgSpeedMs, minSpeedMs}`.
- **`simulateWBal(sectors, physiology, reserveR)`** — Skiba forward sim with the recovery gate. Returns trace per sector + min W'bal + breach info.
- **`bundleSectorsForLevel(groundTruth, wbalTrace, displayPreset, plannedSpeedMs)`** — slider's display aggregation. Builds bundles with time-weighted aggregates and a `components` array so NP can be computed honestly.
- **`computeNormalizedPower(entries)`** — Coggan NP. Works on `bundle.components` for bundle NP and on the full `groundTruth` array for the Total row's NP.
- **`getRiderPhysiology()`** — central physiology accessor. Returns `{cp, wPrime, mode}` from CP/W' inputs directly or from a 2-parameter Power Curve fit (`fitCPWFromCurve`).
- **`tierForGrade(g)` + `easySectorFloorWatts(g, cp)` + `steepnessMultiplier(g)`** — the three small functions that turn a grade into a tier label, a power floor, and an above-CP weight.
- **State additions:** `state.sectorDetailLevel` (1..5, default 3). Slider DOM: `#sectorDetailSlider` + `#sectorDetailCurrent` label. Handler: `onSectorDetailSliderInput(value)`.

### Known follow-ups / open issues to keep in mind

- **Open Issue Climb-Planner #0 — cadence on the legacy gear/cadence card** is still deferred. The per-sector breakdown computes cadence correctly point-by-point at the chosen gear's ratio; the bug is in the legacy card's formula path which only surfaces in Simple Power / manual-input modes now. Sub-commit 5 candidate.
- **Phase 3 i18n keys.** Sub-commits 1, 2, 3, 4 introduced many English-only `data-i18n` keys on `tools/climb-planner.html` (search the file for `data-i18n=` to enumerate). Sub-commit 5's translation pass will add EN/DE/ES/PT entries for all of them in `lang/*.json`.
- **Per-sector tuning knobs** that might want adjustment after more real GPX testing: `MG_GRADE_REFERENCE_PCT` (7), `MG_DOUBLING_GRADE_PCT` (4), easy-sector floors (60 % / 67 % CP), the W'bal recovery gate width (30 W), the slider preset thresholds. Defaults are defensible but FWA may want them shifted.

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
- **2026-04-26** — **Sub-commit 3 (steepest-section warning) committed on `phase-3-climb-planner`** (3 commits, not yet merged to main). Time-window scan over the cursor segment (10 s / 30 s / 1 min / 3 min / 5 min / 10 min) at the rider's planned rolling speed, comparing required power per window to capability for that exact duration. Capability source self-picks: CP/W' → `CP + W'(1−R)/t`; Power Curve → curve at `t/(1−R)`; Simple Power → single number for ≥ 60 s windows (degraded). Worst positive gap becomes the warning; otherwise a "within sustainable range" positive note. **Speed iterated** from planned power per FWA's call (so power changes propagate coherently to speed and cadence) — confirmed in spec discussion as the correct call vs. fixed-pace alternatives. Two follow-ups added (a) red-border highlight + auto-scroll on missing required fields and (b) single-pass validation marking *every* missing field at once across all four checks instead of bailing at the first.
- **2026-04-26** — **Scope change: Sub-commit 4 grew from a small refinement into the *real* answer for Open Issue #1 (avg-grade-only calculation).** The steepest-section warning landed in Sub-commit 3 was the MVP-light surface; testing made clear that surfacing the problem isn't enough — the rider needs an actual per-sector ride plan. FWA's framing: "this is the right feature; the warning was a shortcut." Sub-commit 4 became the per-sector breakdown with full Skiba W'bal physiology. The plan doc's original 5-sub-commit shape stays (3 = warning, 4 = units re-render, 5 = polish) but Sub-commit 4 the *unit re-render* item now sits inside Sub-commit 5 alongside polish, and Sub-commit 4 is the breakdown. Plan-doc text not retroactively updated; this Decisions entry is the source of truth.
- **2026-04-26** — **Skiba W'bal model adopted for Sub-commit 4.** Above CP: linear depletion at `(P − CP) J/s`. Below CP: exponential recovery `dW'/dt = (W' − W'bal)/τ` with τ = `546·exp(−0.01·DCP) + 316`. Critical departure from literal Skiba: a recovery gate `min(DCP/30, 1)` ramps the recovery rate from 0 at exactly CP up to full Skiba at 30 W below — fixes the "W' grows at CP" artefact (Skiba's literal model technically allows τ ≈ 862 s recovery at CP, which most practitioners and FWA's intuition treat as zero). Forward simulation runs at 1-second steps over the per-sector pacing, tracks `minWbal` and feasibility against the `W' × R` reserve floor.
- **2026-04-26** — **Smooth steepness multiplier `M(g) = 2^((g − 7) / 4)` replaces discrete grade bands** for the W' allocation toward steeper hard sectors. Doubles every 4 grade-points beyond the 7 % reference. M(7%)=1, M(10%)≈1.68, M(13%)≈2.83, M(15%)=4. Rationale: a discrete band table makes 6.9 % vs 7.1 % completely different ride decisions, which doesn't match how grades feel. Two named constants (`MG_GRADE_REFERENCE_PCT`, `MG_DOUBLING_GRADE_PCT`) hold the parameters so retuning is a two-line edit. Caveat documented: function tilts allocation but doesn't change the energy budget — long+steep sectors still budget-bound regardless of M(g) shape.
- **2026-04-26** — **Tier-based sector classifier replaces binary Hard/Easy** with six tiers: Descent (< 0 %), Easy (< 3 %), Manageable (< 7 %), Hard (< 10 %), Steep (< 16 %), Brutal (≥ 16 %), strict-< on the upper edge. Sources: theclimbingcyclist.com + tickettoridegroup.com bands, reconciled. The pacing-Hard flag is *derived* from the tier (≥ Hard means above-CP allocation), so the chip in the table and the math the algorithm runs share a single source of truth. **Asymmetric merging:** Hard / Steep / Brutal runs always survive (only the absolute floor filters pure GPX noise); Descent / Easy / Manageable runs shorter than `MIN_SECTOR_SECONDS` get absorbed. So a 100 m kicker at 8.4 % inside a 3.3 % avg sector becomes its own row instead of hiding in the avg.
- **2026-04-26** — **Easy-sector power floor by tier.** A climbing sector should keep some pressure on the pedals — riding at 30 % of CP through a "manageable" stretch is unrealistic. Floors per tier (% of CP): Descent → 0 % (coast), Easy / flat (< 3 %) → 60 %, Manageable+ (≥ 3 %) → 67 %. Hard / Steep / Brutal sectors' natural required power is already above these floors so the floor is informational only. Easy-sector pacing rule: `power = clamp(required_at_max100m, tier_floor, CP)`.
- **2026-04-26** — **Max-100 m representative grade for power decisions** (not just for the display column). Easy sectors are paced for the steepest 100 m sub-bit they contain (capped at CP) so a 3.3 %-avg sector with an 8.4 % spike runs at ~205 W instead of 133 W. Hard sectors' M(g) keys off max-100 m too. The classifier's hard/easy boundary detection still uses local per-point grade.
- **2026-04-26** — **Point-by-point time/speed integration per sector.** Sector time = Σ (segment_length / segment_speed) walking every GPX segment at the chosen constant rider power on local grade. Replaces the old uniform-avg-grade approximation. Displayed sector time and avg speed reflect what the rider actually experiences (slow on steep sub-bits, fast on gentler ones). The integrator also tracks `minSpeedMs` for the lowest-cadence display.
- **2026-04-26** — **Detail-level slider is a display lens, not a model parameter.** Pacing + W'bal sim always run on the same fine-grained ground-truth sector decomposition (`GROUND_TRUTH_PRESET`: smoothing ±50 m, no merge thresholds). The slider then *bundles* adjacent ground-truth sectors into display rows. Bundles show time-weighted aggregates: power = `Σ(P·t)/Σ(t)`, length / time / elevation summed, max-of-maxes for steepest peak, first/last component's W'bal. **Total time, avg power, NP, and end W'bal are invariant across slider levels by construction.** Bundles aggregating multiple components show "—" for Gear · low RPM (gear isn't a single number across mixed-power components). Earlier behaviour where the slider quietly changed totals was a bug per FWA's surfacing — fixed in follow-up 7.
- **2026-04-26** — **Normalized Power column added.** Coggan formula on a per-second timeline: 30-second rolling avg → mean of 4th powers → 4th root. NP = avg for constant-power bundles; NP > avg whenever a high-power chunk sits inside a lower-power one. Total-row NP is computed from the ground-truth array directly so it's stable across slider levels.
- **2026-04-26** — **Lowest cadence in the Gear column** (instead of avg cadence). The integrator tracks `minSpeedMs` per sector; the displayed cadence is the rider's RPM in the picked gear at that min speed — what they see at the steepest sub-bit. Header renamed "Gear · cadence" → "Gear · low RPM". Per FWA: "show the lowest cadence the rider will have in that sector. If it is higher, it's good, but they should know the lowest value."
- **2026-04-26** — **`findOptimalSpeed` rewritten as bisection.** Old Newton-Raphson got trapped at the v = 0.5 m/s floor on descents because P_required(v) is non-monotonic at low v on negative grades — derivative changes sign at v ≈ 3 m/s on a -1 % grade, so a positive power-deficit produced a negative speed adjustment that clamped at the floor. Bisection in `[0.5, auto-expanded hi]` is bracket-monotonic in the relevant region. Speed cap raised from 15 → 50 m/s so real descents (60+ km/h) aren't artificially clipped.
- **2026-04-26** — **Power Curve mode → fitted CP/W'.** `fitCPWFromCurve(points)` does 2-parameter linear least-squares on the linearised `P = CP + W'/t` (regression in 1/t vs P space). Sanity-rejects fits with CP < 30 W or W' < 1 kJ. So Power Curve mode feeds the same physiology pipeline as direct CP/W' input; footer shows a "(CP/W' fitted from your power curve)" tag.

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

- `tools/climb-planner.html` — single-file tool, ~5800 lines as of end-of-session-2 (was ~3700 before Phase 3). Sections in order: chrome CSS + tool CSS, chrome HTML, Step 1 / 2 / 3 markup, result section markup (which now includes Reserve in the tank → speed warning → steepest-section warning + positive note → sector-breakdown panel → legacy result cards + power analysis), chrome JS (IIFE), tool JS.
- Tool JS top-level state object (`let state`) is the source of truth for everything: cursor segment, gpxPoints, calculatedSustainablePower, reserveFraction, **sectorDetailLevel (Sub-commit 4)**, resultsVisible, lastResult, zoom range, etc. Document any new state additions when you add them.
- `getPlanningSegment()` returns the cursor-defined segment; everything downstream reads from it (or from `state.selectedClimb` which mirrors it).
- `updatePowerCalculations()` is the central recompute function. It re-renders the Step 3 banner and (when `state.resultsVisible`) re-runs `calculateClimb(silent=true)` for live results. Wire any new live-update behaviour into this path rather than adding ad-hoc listeners.
- `calculateClimb(silent)` is both the manual button handler (silent=false, shows alerts) and the auto-refresh path (silent=true, returns quietly on incomplete inputs). Don't break the silent contract — it's load-bearing. After computing speed/drivetrain/totals it tail-calls `runSteepestSectionWarning(...)` then `runSectorBreakdown(...)` — both ride the same live-refresh path.
- `js/i18n.js` was patched during Sub-commit 2 to add a `hasTranslation(key, language)` overload and to skip the markup overwrite when a key has no translation in either the current or fallback language. Future translation work should land in `lang/*.json` and will start showing automatically.

### Sub-commit 3 + 4 helpers (where the new physics lives)

Top of the algorithm section in `tools/climb-planner.html` (~lines 4900-5700):

- **Sector classification:** `tierForGrade(g)`, `tierOrdinal(label)`, `isHardTier(label)`, `identifyHardSectors(seg, points, plannedPower, plannedSpeed, mass, eff, preset)`, `buildSectorStats(points, startIdx, endIdx, tierLabel)`.
- **Detail-level presets:** `SECTOR_DETAIL_PRESETS[1..5]`, `GROUND_TRUTH_PRESET`, `getSectorDetailPreset()`, `onSectorDetailSliderInput(value)`.
- **Pacing:** `paceAllSectors(...)`, `paceHardSector(sector, hardPower, points, mass, eff)`, `paceEasySector(sector, plannedSpeed, physiology, points, mass, eff)`, `easySectorFloorWatts(grade, cp)`, `steepnessMultiplier(grade)`, `allocateHardExcess(hardSectors, usableJ)`.
- **Physics:** `riderRequiredAtSpeed(grade, mass, speed, eff)`, `speedForRiderPower(power, mass, grade, eff)`, `findOptimalSpeed(availablePower, mass, gradeRad)` (bisection version), `integrateSectorAtPower(sector, points, power, mass, eff)`.
- **W'bal:** `simulateWBal(sectors, physiology, reserveR)`, `skibaTau(cp, currentPower)`.
- **Physiology source:** `getRiderPhysiology()`, `fitCPWFromCurve(curvePoints)`.
- **Display:** `bundleSectorsForLevel(groundTruth, wbalTrace, displayPreset, plannedSpeedMs)`, `runSectorBreakdown(speedMs, drivetrainEff, mass, plannedPower)`, `renderSectorBreakdown(bundles, wbal, physiology, plannedPower, mass, eff, groundTruth)`, `setLegacyResultCardsVisible(visible)`, `computeNormalizedPower(entries)`.
- **Steepest-section warning (Sub-commit 3, still used in Simple Power mode):** `runSteepestSectionWarning(...)`, `steepestCapabilityAt(seconds)`, `steepestWorstWindow(...)`, `formatWindowLabel`, `formatWindowLength`.
- **Validation UX:** `clearFieldMissing()`, `markFieldsMissing(ids)`, `powerCapabilityInputIds()`. Document-level `input` + `change` listeners auto-clear `.field-missing` on first edit.

### Tunable constants worth knowing about

| Constant | Default | Purpose |
|---|---|---|
| `MG_GRADE_REFERENCE_PCT` | 7 | Grade where M(g) = 1 |
| `MG_DOUBLING_GRADE_PCT` | 4 | M doubles every this many grade-points |
| `GROUND_TRUTH_PRESET.smoothHalfKm` | 0.050 | ±50 m grade smoothing for the always-fine classifier |
| Easy floor (< 3 % grade) | 0.60 × CP | Min watts on flat/easy sectors |
| Easy floor (≥ 3 % grade) | 0.67 × CP | Min watts on actually-climbing easy sectors |
| W'bal recovery gate width | 30 W | Recovery rate ramps from 0 at CP to full Skiba at CP − 30 W |
| Per-sector excess ceiling | `W'(1−R) / sector_duration` | Hard sector can't claim more than its solo physiology |
| `SECTOR_DETAIL_PRESETS` | 1: 240 s / 200 m … 5: 30 s / 15 m | Slider-level bundling thresholds |
