# Phase 3 — Climb Planner: design alignment & implementation plan

**Status:** design aligned 2026-04-25 between FWA and Claude. Ready to implement in a future session.
**Scope:** all open issues for `tools/climb-planner.html` plus the Step 2 framing redesign and the over-segmentation cursor chart.
**Size:** L (the heaviest single MVP item).

This document is the source of truth for Phase 3 design decisions. The next session that picks up implementation should read this file end-to-end **before** writing code, then proceed sub-commit by sub-commit per the "Implementation plan" section.

---

## Pre-reading (in this order)

1. `CLAUDE.md` — the running project journal. Confirm "Current state" still says Phase 2 complete and nothing's changed.
2. `CLAUDE.md` → "MVP work plan" → Phase 3 — recap the high-level goal.
3. `CLAUDE.md` → "Open issues" → "Climb Planner" — the issue numbering used here.
4. `CLAUDE.md` → "Open design questions" — captures the Step 2 reasoning that led to the design below.
5. **This file**, end-to-end.

---

## Design decisions

### 1. Steepest-section warning — physiology-based, not "fixed window"

**Goal:** warn the rider when a sustained section of the selected segment requires more power than they can deliver for that section's duration. Replaces the "max grade" nominal display being effectively unused today.

**Algorithm:**

For the user-defined climb segment (cursor-defined; see decision 3):

1. Build a power-required profile across the segment from the elevation/distance points and the user's intended rolling speed.
2. Scan multiple **time windows** — 10 s, 30 s, 1 min, 3 min, 5 min, 10 min.
3. For each window size, find the window with the highest required power (slide across the segment).
4. Compute the rider's **maximum sustainable power for that window's duration** (`P_max(t)`). The model used depends on the rider's data:
   - **CP + W' available** (entered in new Step 2 OR new Step 3 method = CP/W'): `P_max(t) = CP + W' / t`. Full algorithm.
   - **Power Curve available** (Step 3 method = Power Curve): read off the rider's curve directly. Full algorithm.
   - **Simple Power only** (Step 3 method = Simple Power, no Step 2 CP+W'): we have one number = sustainable for the climb's whole duration. Degraded mode: flag any window where required power exceeds that number for ≥ 1 minute. Coarser warning.
5. Compute the **gap** = required power − `P_max(t)` for each window.
6. The window with the **biggest positive gap** is the worst interval. That's the warning shown.

**Why time-windows, not distance-windows:** a 50 m at 20% chunk lasts ~10–20 s; a rider's 20 s capability is very high (anaerobic), so the gap is small. A 500 m at 19% chunk lasts ~3 min; the rider's 3-min capability is much lower, so the gap is huge. Time-window scanning naturally surfaces the long-and-steep section that actually breaks the rider.

**Warning text examples:**

- Full mode: *"Brutal section: 500 m at 19% — needs about 380 W for ~3 min, but you can only sustain ~310 W for that long. You'll deplete W' or have to slow significantly."*
- Degraded mode: *"Brutal section: 500 m at 19% — required power exceeds your expected average for this climb. Likely to force a slowdown."*

**Edge cases to handle:**

- Selected segment shorter than the smallest window (e.g. 30 s climb): scan only windows ≤ segment duration.
- No window exceeds rider's capability: show a positive note ("Within your sustainable range across all sub-sections") instead of an alarm.
- Multiple comparable warnings (two equally-bad sections): show the worst; optionally a "see all" link to expand.

### 2. Step 2 / Step 3 flip + new contents

Today's order: **1 Climb → 2 Power Capability → 3 Rider & Equipment**.
New order: **1 Climb → 2 Rider Profile → 3 Power for this climb**.

Why the flip: the duration estimate (used to recommend the right power-input method in Step 3) is much better when computed from the rider's real weight + sustainable power than from a generic baseline. Putting the rider data first makes that estimate concrete.

#### New Step 2 — Rider Profile

```
Step 2 — Rider Profile

  Rider weight (kg):  [____]   (required, or default with warning)
  Bike weight (kg):   [____]

  Power capability (optional, but enables better recommendations & warnings)
  CP and W' is the preferred input — it delivers the most accurate recommendations and steepest-section warnings.
    ○ I know my FTP only
    ○ I know my CP and W'  (preferred)

    [field(s) appear based on the radio choice]
      FTP (W): [____]
      — or —
      CP (W): [____]    W' (kJ): [____]
```

- Default radio: "I know my FTP only" with the field blank → falls back to baseline (FTP 250 W) with a disclaimer in Step 3.
- The "(preferred)" label and helper line on the CP+W' option are intentional: CP+W' is the only input that lets the steepest-section warning algorithm (Sub-commit 3) run in full mode for windows shorter than the climb's total duration. FTP/Simple Power degrade the warning to a coarser comparison.
- CP + W' entered here flow to Step 3's CP/W' method (no re-entry) AND to the steepest-section warning algorithm.
- FTP-only here: used for duration estimate. The warning algorithm runs in degraded or full mode depending on what Step 3's chosen method provides.

#### New Step 3 — Power for this climb

The three methods (Simple Power / CP-W' / Power Curve) all stay. The smart default is now driven by the duration estimate using Step 2 inputs:

- **Step 2 filled** (weight + FTP or CP+W'): *"Estimated duration: ~75 min — Power Curve recommended."*
- **Step 2 blank**: *"Estimated duration: ~75 min — Power Curve recommended. ⚠️ Estimate assumes a rider with FTP 250 W; enter your own in Step 2 for a tailored recommendation."*

Recommendation bands (unchanged from CLAUDE.md): < 40 min → CP/W'; 40–60 min → Power Curve recommended (CP/W' OK); > 60 min → Power Curve. User can always override.

**Method labels:**

- "Simple Power" → keep with a refined label: **"Expected avg. power for this climb"**, sub-label *"What you can hold for this climb's duration — your gut feel."*
- "CP-W' Model" → keep label, but **pre-fill CP and W' from Step 2** if the user entered them there.
- "Power Curve" → keep label.

**Tool intro (above Step 1):** add a short line stating power data is required:
> *"This tool needs a power capability number (FTP, CP, or your historical best). HR-only and no-meter riders aren't supported yet."*

#### Reserve in the tank (CP/W' and Power Curve)

A "reserve" control sits at the top of Step 3 (under the smart-default banner, above the method radios) for users who don't want every climb plan to assume an all-out, W'-depleting effort. Three preset chips (0% / 25% / 50%) plus a small custom-% input.

- Default: 0% — preserves today's "best possible effort" semantics, useful for KOM hunts.
- Applies to **CP/W'** as `P(t) = CP + W' × (1 − R) / t`.
- Applies to **Power Curve** by reading off the curve at `t / (1 − R)` — the power you could hold for the climb duration plus enough margin to finish with R fraction of W' still in the tank.
- Does **not** apply to "Expected avg. power for this climb" (Simple Power) — that's already the user's gut-feel sustainable number; applying reserve to it is meaningless. When Simple Power is the chosen method, the reserve control fades (50% opacity) and shows "*(not applied to this method)*".
- Capped at 90% so the read-off never divides by zero.
- The same reserve fraction will feed into Sub-commit 3's steepest-section warning, so the warning's threshold matches the rider's chosen pacing intent rather than always assuming all-out.

Decided 2026-04-25 mid-implementation: FWA noticed during the first real GPX test that a 30-min CP/W' suggestion was honest but burned the entire W' reserve on one climb. Adding this control keeps the original "race-pace" framing valid while offering an alternative for riders saving matches for later in the ride. Bolted onto Sub-commit 1.

### 3. Cursor chart — interactive elevation profile with draggable bounds

Today, after a GPX upload, the auto-detector finds 15 climbs on a 134 km alpine route — useless. The fix: an interactive elevation chart at the top of Step 1, with two draggable cursors that define the planning segment.

#### Placement

- After GPX upload, the chart appears as the **new top of Step 1**, above the parsed-GPX numeric summary.
- Manual-entry path (no GPX): chart not shown.
- Numeric summary (distance / elevation gain / avg grade / max grade) stays — its values are now driven by where the cursors are.

#### Implementation

- Library: **Chart.js** (already a dependency on `tools/cp-analyzer.html`). Plot the elevation vs. distance line.
- Cursors: **two HTML elements** (e.g. `<div>` with vertical-line styling) absolutely positioned over the chart canvas. Custom mouse + touch event handlers map screen X → data X.
- No additional Chart.js plugins required.

#### Auto-detection coexistence

Don't remove the auto-detector — surface it differently:

- Auto-detect runs on GPX upload as it does today.
- Render each detected climb as a **tick mark** on the chart's distance axis (subtle, e.g. small triangle pointing up at the climb's start, another at the climb's end, or a thin shaded band).
- Click a tick → cursors snap to that detected climb. Drag cursors to refine, merge, or split.
- The current dropdown / list of detected climbs is **removed** in favour of the tick-on-chart UI.

#### Macro / Detailed toggle

A toggle in the chart UI controls the auto-detection's descent-tolerance threshold:

- **Macro** (default): large descent tolerance — alpine route's two big massifs become two ticks; user picks the dominant one.
- **Detailed**: smaller descent tolerance — same route shows ~6–7 tick suggestions for sub-climbs.

Toggle re-runs auto-detection at the new tolerance and re-renders ticks. Cursor positions are **preserved** unless the user clicks a new tick. Default is Macro (matches the most common use case for this tool).

#### Real-time updates

While dragging:
- Numeric summary (distance, elevation, avg grade, max grade) updates **live**, throttled to ~30 fps.
- Time estimate (Step 3 result) and steepest-section warning recompute **on cursor release** (more expensive, jittery if live).

#### Mobile / touch

- Cursor hit targets ≥ 40 px tall on touch devices.
- Chart fills viewport width on narrow screens.
- Below the chart, **two numeric inputs** ("Start: km 12.5", "End: km 28.3") let users type exact values when dragging is fiddly.

#### Multiple climbs in one route

For MVP, only **one cursor pair at a time**. If a user wants to plan two climbs from one route, they re-position the cursors. Multi-climb planning is post-MVP (Route Planner territory).

### 4. Metric / Imperial toggle re-renders after GPX upload (Issue #3)

- Toggle re-renders the parsed GPX summary, all displayed numbers, and result outputs.
- **Never re-parse** the GPX. Underlying data stays in metric internally; conversion is display-only.
- Grade is unchanged (it's a ratio).

### 5. i18n strategy — scoped exception for Phase 3

The site-wide hard rule: every user-visible string change updates all 4 `lang/*.json` files in the same change.

`tools/climb-planner.html` is currently 100% English (Open Issue #4). Adding more English strings during Phase 3 doesn't worsen the picture.

**Phase 3 exception:** new strings introduced on `climb-planner.html` may be added **English-only** during Phase 3. The full translation pass for that page lands as part of **Phase 5** (final i18n sweep).

This exception applies **only to `tools/climb-planner.html` and only during Phase 3**. All other pages (`index.html`, `tools/cp-analyzer.html`) and the chrome on every page still follow the hard rule for any change touching their strings.

---

## Implementation plan — 5 sub-commits

Land in this order. Each is a separate commit on a feature branch (`phase-3-climb-planner`), pushed for FWA review, fast-forward merged after approval.

### Sub-commit 1 — Step 2 / 3 flip + new Step 2 + Step 3 power-method picker

**Goal:** the new step structure is in place. Smart-default recommendation logic exists and reads from Step 2 inputs. No chart yet, no warning yet.

**Scope:**
- Restructure HTML: move "Rider & Equipment" content into the new Step 2 slot; move "Power Capability" content into Step 3.
- Add the FTP-only / CP+W' radio toggle in Step 2; show fields conditionally.
- Add tool intro line (HR-only out of scope).
- Rename "Simple Power" → **"Expected avg. power for this climb"** with sub-label.
- Wire CP+W' from Step 2 to pre-fill Step 3's CP/W' method when chosen.
- Implement duration estimate function: takes climb stats + (rider weight, FTP-or-CP) → estimated duration.
- Show smart-default recommendation in Step 3 with disclaimer when Step 2 is blank.

**Done when:** new step layout renders, smart default shows the right method per duration band, Step 2 inputs flow into Step 3's CP/W' method, existing time calculation still works against the user's chosen Step 3 method.

**i18n:** introduce new English strings in markup + `data-i18n` attributes on `tools/climb-planner.html`. Skip translation per Phase 3 exception.

### Sub-commit 2 — Cursor chart on GPX upload

**Goal:** elevation profile chart with draggable cursors replaces the dropdown picker. Macro/Detailed toggle works. Real-time numeric updates.

**Scope:**
- Add Chart.js as a dependency on `climb-planner.html` (same CDN URL as `cp-analyzer.html` uses).
- Render elevation profile from parsed GPX.
- Two HTML cursor handles overlaid on chart, draggable via mouse + touch.
- Throttle re-renders of the numeric summary to ~30 fps during drag.
- Auto-detect ticks on chart axis; click-to-snap cursors.
- Macro/Detailed toggle re-runs detection.
- Numeric inputs below chart for exact start/end entry.
- Remove existing dropdown picker.
- Theme support — chart redraws on `bikeToolz:themechange` event (consistent with cp-analyzer's pattern).

**Done when:** GPX upload of an alpine route shows a usable chart, cursors define a segment, ticks suggest auto-detected climbs, Macro/Detailed toggle changes the suggestions, all downstream calculations key off the cursor segment.

**i18n:** new strings English-only per exception.

### Sub-commit 3 — Steepest-section warning

**Goal:** the warning algorithm runs against the cursor-defined segment using the rider's power data. Shows full-mode or degraded-mode warning text.

**Scope:**
- Implement the time-window scan algorithm (10 s, 30 s, 1 min, 3 min, 5 min, 10 min).
- Compute required power per window from grade + intended rolling speed.
- Compute `P_max(t)` based on rider's available data (CP+W' from Step 2/3, Power Curve from Step 3, or Simple Power degraded fallback).
- Find the worst gap.
- Render the warning under the time estimate result.
- Recompute on cursor release + on Step 3 method/value changes.

**Done when:** alpine GPX with a known sustained ramp shows the right warning; degraded mode kicks in cleanly when only Simple Power is available.

**i18n:** new strings English-only per exception.

### Sub-commit 4 — Metric / Imperial toggle re-render (Issue #3)

**Goal:** toggling units re-renders the GPX summary, displayed numbers, and result outputs.

**Scope:**
- Listen for `bikeToolz:unitchange` event in climb-planner's tool script (already partially wired in Phase 2).
- Re-render: parsed GPX summary, cursor numeric inputs (km ↔ mi), elevation values (m ↔ ft), result outputs.
- Never re-parse the GPX.

**Done when:** uploading a GPX in metric, toggling to imperial, seeing all numbers convert without re-parsing or losing cursor positions.

**i18n:** no new strings (units come from existing chrome i18n).

### Sub-commit 5 — Polish & copy

**Goal:** final UX polish before Phase 4.

**Scope:**
- Tooltip / info icon on each Step 3 method explaining *why* it fits which climb length (text per CLAUDE.md "Open design questions").
- Refine warning copy per real-world test cases.
- Verify intro line + Step 2 disclaimer copy is accurate.
- Final manual smoke test with a real alpine GPX (FWA-supplied).

**Done when:** FWA does a full walkthrough of a real route and signs off.

**i18n:** new strings English-only per exception.

---

## Things to revisit during implementation

These are deliberately deferred — flag them if they become blockers, otherwise leave to the implementing session's judgment.

- **Rolling speed for required-power calc.** The warning algorithm needs an assumed pace. Options: use the time estimate's own pace, use Step 3's chosen power → pace, or iterate. Lean toward "pace from time estimate" for simplicity.
- **Window granularity below 1 minute.** The 10 s / 30 s windows may be noisy if the GPX point density is low. May need elevation smoothing.
- **Multiple equally-bad windows.** The first version shows only the single worst. If users find this misleading ("there are three nasty ramps but you only show one"), add a "see all" affordance.
- **Macro / Detailed thresholds.** The exact descent-tolerance numbers will need tuning against real routes — start with Garmin-defaults for Detailed, ~5× looser for Macro.
- **Cursor click vs drag on touch.** A tap on the chart should not be ambiguous between "set cursor" and "scroll page." Use touch-action: none on cursor handles, default scroll otherwise.

---

## References

- `CLAUDE.md` — running project journal; "MVP work plan" + "Open issues" + "Decisions log".
- `tools/climb-planner.html` — current implementation; auto-detection algorithm lives in the inline `<script>` block.
- `tools/cp-analyzer.html` — Chart.js usage example; same pattern for the elevation chart.
- `js/i18n.js` — i18n loader; `data-i18n` keyed strings.

---

**Sign-off:** design aligned 2026-04-25. Implement when the next session picks up Phase 3.
