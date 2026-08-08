# Report catalogue — what reports, for whom, and the scenarios they must survive

The working index for reporting. Intended as the body of the "extended / detailed reports & stats" epic.

**Reporting is not one feature.** It is roughly forty distinct artefacts across five families, with different consumers, different homes, and different failure modes — which is why 88 open issues have accumulated without the topic ever feeling *addressed*. Each issue is a leaf. Nobody has drawn the tree.

Two prior decisions govern this page, and it is not worth re-deriving them here:

- [`where-reports-should-live.md`](where-reports-should-live.md) — reports split on whether the data can leave BV. **Tabulation → the library. Electorate → BV, necessarily.** Ask BV for raw data and schema stability, not conclusions.
- [`tiebreak-audit-report.md`](tiebreak-audit-report.md) · [`reporting-and-voter-status-map.md`](reporting-and-voter-status-map.md) — the two subsystem reads.

**Status key:** ✅ exists · 🟡 partial · ❌ missing · `#N` filed upstream

---

## The five consumers

Every report below serves one of these. When a report tries to serve two, it usually serves neither — most of the confusion in the existing issues is a report written for an auditor being asked to satisfy an admin.

| Consumer | Wants | Reads |
|---|---|---|
| **Voter** | did my ballot count? | receipt, results page |
| **Admin** (club, HOA, small org) | is this working? can I close? | BV's admin UI |
| **Auditor / observer** | can I verify this without trusting BV? | exports, independent engines |
| **Candidate** | how did I do, and where? | results detail |
| **Researcher / educator** (us) | how do methods differ? | the library |

---

## Family 0 — Settings decide which reports *exist*

Before any catalogue entry means anything: **a report is not a fixed artefact. Election settings decide whether it exists, what it can say, and what its numbers mean.** This is a precondition for reading everything below, not a footnote to it.

### Only one of six modes can have a bounce report

`VoterAuthenticationMode.ts` names **six canonical shapes** for the `{voter_access, voter_authentication, invitation}` triple, and calls itself their single source of truth. Family 3 is not available in most of them:

| Mode | Roll? | Email events? | Family 3 gets |
|---|---|---|---|
| `open_unique_cookie` | ❌ | ❌ | **nothing** |
| `open_unique_keycloak` | ❌ | ❌ | **nothing** |
| `open_unique_ip_address` | ❌ | ❌ | **nothing** |
| `open_open` | ❌ | ❌ | **nothing** |
| `closed_admin_managed_ids` | ✅ | ❌ *(no invitation)* | voted / not-voted only |
| `closed_bv_managed_ids` | ✅ | ✅ *(`invitation: 'email'`)* | **the full report** |

The four `open_*` modes have no roll at all — `getRollsByElectionID` throws `Unauthorized("Can't view voter roll for open elections")` (`:108`). So **turnout, quorum, non-voter lists and deliverability are structurally impossible in four of six modes**, and half-available in a fifth.

That is not a gap to be closed; it follows from there being no electorate to report on. But it means every Family 3 entry needs an availability precondition attached, and **#789 should say which mode it targets** — as written it reads as universal.

### Settings that change what a report means

| Setting | Effect on reporting |
|---|---|
| `voter_access` | `open` ⇒ **no Family 3 at all** |
| `invitation` | `email` ⇒ events exist **and** `voter_id` is redacted, so the report keys on `email`. `address` ⇒ no events |
| `voter_authentication.ip_address` | the only mode that sets `ip_hash` — and it is stripped from the roll response anyway (`:149`) |
| **`ballot_updates`** | **voters may revise ballots.** Raw ballot count ≠ distinct voters — and `rawVoteCount` is the **tie seed input**. Restricted to closed + email elections |
| `break_ties_randomly` | if `false`, the shuffle never runs. **The tie report needs a different branch entirely** — a true tie that is *reported as unresolved* rather than broken |
| `reminders` | multiple sends per voter ⇒ event lists are per-message, not per-voter. Aggregation must dedupe |
| `max_rankings`, `exhaust_on_N_repeated_skipped_marks` | the exhaustion/truncation policy. **What was *allowed* vs what voters *did*** — exactly `#1485` |
| `random_candidate_order` | ballot presentation order — **distinct from `tieBreakOrder`**, and easily confused in a report that shows both |
| `term_type` | `poll` vs `election` — report wording, everywhere |
| `time_zone` | timestamp rendering; answers the open question in `#789` about whose timezone |
| `public_results` | whether results are visible at all |

**`ballot_updates` is the sharpest of these** and deserves its own check: if voters can revise, does the tie seed's `rawVoteCount` (`cvr.length`) count revisions or only head ballots? `ElectionRoll.ballot_id` is documented as *"the head ballot for this voter"*, so versioning exists. If superseded versions are in the CVR, the seed moves on every *edit* as well as every vote — which is defensible, but nobody has stated it, and it is the kind of thing an auditor finds the hard way.

**Consequence for the whole catalogue:** the configuration snapshot (Family 4) is not one report among forty. It is the **legend** — without it, no other report can be interpreted, and two elections' reports cannot be compared.

---

## Family 1 — Result & tabulation

**Home: the library** (BV renders a summary for voters; depth lives with us).

| Report | Consumer | Status |
|---|---|---|
| Result summary — winner, margin, seats | all | ✅ both |
| Round detail — STAR score round + runoff; IRV eliminations; RR pairwise | auditor, researcher | ✅ LH · 🟡 BV |
| Pairwise / Condorcet matrix | auditor, researcher | ✅ LH · 🟡 BV |
| Score distribution per candidate | candidate, researcher | ✅ LH `show_score_counts` |
| Runoff reconciliation — decided voters, Equal Support, majority threshold | auditor | ✅ LH `show_runoff_percent` |
| Smith set / cycle detection | researcher | ✅ LH `show_smith_set` |
| **Method divergence** — would another method seat someone else? | researcher, debater | ✅ LH `[Divergence from STAR]` |
| **Tie resolution** | auditor | 🟡 see Family 5 |
| Per-precinct breakdown | admin, candidate | ❌ (`precinct` is carried but never aggregated) |

**The gap worth naming:** precinct is collected on every ballot and exported in the CSV, and nothing anywhere groups by it. That is a whole report family sitting one `GROUP BY` away.

---

## Family 2 — Ballot data & reconciliation

**Home: BV must export; the library reconciles.** This is where the *data* asks live, and per the governing decision these outrank new reports.

| Report | Consumer | Status |
|---|---|---|
| Raw CVR — every ballot as cast | auditor | ✅ CSV/JSON |
| Processed ballots — what the tabulator actually saw | auditor | `#1160` |
| **The delta between them, with a reason per dropped ballot** | auditor | ❌ **the important one** |
| Validity breakdown — valid / overvote / undervote / abstention / out-of-bounds / duplicate rank | admin, auditor | 🟡 counts exist, not itemised |
| Multi-race CSV | all | `#883` |
| CSV header / meta-column clarity | auditor | `#1085`, `#1039` |
| Stable export schema | **us** | `#1420` ← **highest value on this page** |
| Interchange formats (ABIF, …) | researcher | `#767` |

**The delta report is the one to fight for.** `nVotes = nOutOfBoundsVotes + nAbstentions + nTallyVotes` is documented in a comment (`ITabulators.ts:60`) and nowhere else. An admin who sees "47 ballots cast, 43 counted" has no way to learn what happened to four of them. Every count-reconciliation dispute lands here, and it is the same root cause as the tie-seed trap: **BV knows why, and never says.**

---

## Family 3 — Electorate & participation

**Home: BV, necessarily** — this data cannot leave and must not (see the governing decision). No cross-check is possible, and none is needed: nothing else holds the roll.

| Report | Consumer | Status |
|---|---|---|
| Voter status — per voter: invited / delivered / opened / voted / bounced / unsubscribed | admin | `#789` 🟡 **data already collected, not aggregated** |
| Turnout summary — eligible / invited / delivered / voted, with % | admin | ❌ |
| Email deliverability — bounce counts and reasons, aggregate | admin | 🟡 per-voter drill-down only |
| **Voter roll export (CSV)** | admin | ❌ **unfiled, smallest viable slice** |
| Non-voter list — for follow-up | admin | ❌ |
| Quorum status — threshold, met/not met | admin | `#763` ❌ (`grep quorum` → zero hits) |
| Roll change audit — who added/removed/edited, when, why | auditor | 🟡 `history[]` exists, unsurfaced |

Recall the finding that reframes this family: **the bounce data is already captured** (signature-verified SendGrid webhook → `emailEventsDB`) **and already arrives on the roll list call** (`getElectionRollController.ts:152`). #789 reads as a greenfield 18-column build; a third of it is a table and a download button over data the client already holds.

---

## Family 4 — Integrity & audit

**Home: split.** BV states the inputs; the library verifies independently.

| Report | Consumer | Status |
|---|---|---|
| Tie reproducibility — seed, order, algorithm version | auditor | see Family 5 |
| Cross-engine reconciliation — BV vs LH vs `pref_voting` | auditor | ✅ library · `#1407` |
| Count reconciliation — raw → filtered → tallied, each drop explained | auditor | ❌ (= the Family 2 delta) |
| **Configuration snapshot** — method, seats, auth mode, abstention policy, in force at close | auditor | 🟡 `#1485` — **the legend for every other report**, see Family 0 |
| Election timeline — opened, closed, results computed, settings changed | auditor | ❌ |
| Ballot receipt / verification | voter | 🟡 |

---

## Family 5 — Ties: why one topic is a matrix

Ties are the proof that this decomposes further than it looks. "Tie reporting" is not a report. It is **method × rung × arity × position**, and each cell needs different words on the page.

### The rungs differ per method

| Method | Ladder |
|---|---|
| **STAR** | score tie → head-to-head *(skipped at 3+)* → five-star count → seeded shuffle |
| **Ranked Robin** | Copeland tie → total margin → lot (LH) / head-to-head → shuffle (BV) — **the engines diverge at rung 2** |
| **IRV/STV** | tie for *elimination* — and who gets eliminated changes everything downstream |
| **Plurality / SNTV** | tie for the last seat |

### The dimensions

| Dimension | Values | Why it changes the report |
|---|---|---|
| **Arity** | 2-way · 3-way · N-way · all-tied | STAR *skips head-to-head at 3+* — different rung, different explanation |
| **Position** | 1st place · advancement to runoff · last seat | a tie for *who advances* reads differently from a tie for *who wins* |
| **Depth** | resolved at rung 1 · cascaded to the shuffle | a cascade needs every rung's failure narrated, not just the last |
| **Winner-affecting?** | yes · no | a tie that resolves without changing the outcome still needs recording, and shouldn't alarm |

That is comfortably 20+ distinct reportable situations before considering multi-winner interactions. **Each needs its own wording**, and none of it is currently rendered.

### What every tie report must carry

From [`tiebreak-audit-report.md`](tiebreak-audit-report.md), the reproducibility block:

`tieBreakType` · **`rawVoteCount`** · `nTallyVotes`/`nAbstentions`/`nOutOfBoundsVotes` · `raceId` · computed seed · `tieBreakOrder` per candidate · `tiebreak_algorithm_version` ❌

**`rawVoteCount` is the one that matters.** The seed is `(rawVoteCount + hash(raceId)) >>> 0`, but the results page shows *tally* votes — a filtered, smaller number. An auditor who uses the displayed figure computes the wrong seed, gets a plausible-but-wrong order, and concludes the tiebreak doesn't reproduce. **A reporting gap that manufactures an integrity accusation.**

---

## Scenario matrix — what reports must survive

The test axis. Most reporting bugs are a scenario nobody rendered, not logic that is wrong.

| Scenario | Stresses |
|---|---|
| **Zero ballots cast** | every denominator | `#1266`-adjacent, "no votes have been cast" |
| **One ballot** | percentages, majority thresholds |
| **All candidates tied** | the full tie ladder to the shuffle |
| **Tie at each rung** | one case per Family-5 cell |
| **Abstentions / blank ballots** | runoff denominator, Equal Support |
| **Partial ballots, all marks equal** | `#1478` — currently dropped as abstention |
| **Overvotes / duplicate ranks** | IRV/STV validity columns |
| **Write-ins** | `#1470` — write-in abstention discards ballots |
| **Multi-race election** | CSV shape `#883`, per-race tie seeds |
| **Multi-winner** — bloc vs proportional | "Top 2 finalist" matrix is meaningless for PR |
| **Quorum not met** | a result that must be reported as *invalid* |
| **Bounced / undeliverable invitations** | turnout denominator: is a bounce a non-voter? |
| **Voter re-votes (edit)** | raw vs tallied count, and the seed |
| **Spoiled / reissued ballot** | `#746` |
| **Election closed early or extended** | timeline |
| **Candidate withdrawal after voting opens** | matrix, transfers |
| **None of the Above wins** | `#1421` |

**The bounce row is subtler than it looks and worth settling explicitly:** if an invitation hard-bounces, was that person *eligible*? Turnout %, quorum denominator, and whether the election is even valid all move depending on the answer, and BV currently has no position on it because it has no quorum concept at all.

---

## The self-verifying YAML — already half-built

A standing idea: **the YAML converted from a BV election should carry BV's expected results, so the case verifies itself.** It is live, and further along than it looks. `01_convert_json_yaml.py` already lifts from the frozen export:

- `expected_results.winners` — BV's winners, checked on every `pytest` run
- **`extract_lot_order()`** — BV's official tie-break order, translated from UUIDs to candidate ids and pinned as `lot_numbers:`, so LH **replays BV's draw exactly**
- `embed_report=True` — the report embedded at conversion time

So the mechanism already turns the test suite into a continuous BV↔LH reconciliation — [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407)'s job, automated. Two notes on extending it:

**The "demo elections only" worry mostly dissolves.** The real constraint is not demo-vs-real but **open-vs-closed**, and even that is handled: we freeze `_bv_export.json`, so the ballot set is immutable regardless of what BV does afterwards. The one case that genuinely needs care is a **tie whose winner turns on the draw** — the seed is `(rawVoteCount + hash(raceId))`, so one more ballot reshuffles it. That is already the standing rule that such cases stay LH-only, and it is a *tie* constraint, not a *demo* constraint.

**Assert on structured facts, never on report text.** Same principle that governs what we ask BV for: data, not rendering.

| Assert on | Not on |
|---|---|
| winners, `tieBreakOrder`/lot, `nTallyVotes` / `nAbstentions` / `nOutOfBoundsVotes`, pairwise matrix, round-by-round tallies | BV's rendered report wording |

Pinning BV's report *text* would couple our test suite to someone else's UI copy, and fail on every cosmetic tweak. Pinning its *numbers* is a real cross-check that only fires when a count actually disagrees. (Our own wording is a different matter — that is ours to lock, and `tests/test_runoff_percent.py` already does.)

**Worth adding next**, in that spirit: the three vote counts, since their sum is the tie seed's input and currently nothing on either side asserts them.

---

## How to slice it

Ordered by value per unit of volunteer effort, which is the scarce resource:

1. **`#1420` — export schema stability.** Unglamorous, load-bearing. Schema drift silently breaks every downstream check we own.
2. **Voter roll CSV export.** Unfiled, self-contained, plausible `good first issue`, and the natural first slice of #789.
3. **`rawVoteCount` in the tie block** (comment on `#1432`). One field. Prevents a manufactured integrity dispute.
4. **The ballot delta report** — why 47 cast became 43 counted.
5. **Turnout + quorum** (`#763`) — needs the eligibility question above settled first.
6. **Everything else**, against this catalogue.

**What not to do:** file a general "we need better reporting" issue. That is #89 of 88. The epic's value is the *index* — this page — not new asks.

---

## Related

- [`where-reports-should-live.md`](where-reports-should-live.md) — the governing decision
- [`reporting-and-voter-status-map.md`](reporting-and-voter-status-map.md) — Family 3 detail
- [`tiebreak-audit-report.md`](tiebreak-audit-report.md) — Family 5 detail
