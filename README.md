# bettervoting-qa

QA test cases, bug analysis, and issue notes for [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting).

**Start here if you are picking this up:** [HANDOFF.md](HANDOFF.md).

Working notes between Adam and Claude. One test case = one Markdown page, versioned, so it can be updated in place instead of copy-pasted between chat and Google Docs.

## Ground rules

This repo is **public**, so that its pages can be cross-referenced from upstream GitHub issues. Two rules follow from that, and they are not optional.

**No credentials.** Test-account logins live in the sheet's testing-credentials tab, never in a page here. (One slipped in on the first draft and was removed before this went public — if you see a password in a diff, that's a bug.)

**Report before publishing.** Anything sharper than a UI or copy defect — unauthenticated data access, missing guards, ID entropy — goes to the maintainers **first**, on the #bettervoting Slack channel or directly to Arend, one item at a time, framed as "is this deliberate?" rather than as a finding. Most such things have a plausible innocent explanation, and leading with an accusation on a volunteer open-source project is both rude and usually wrong. Only after it's been raised does it belong on a page here.

`analysis/preliminary-results-integration-map.md` §7 notes where items were held back for exactly this reason. That's a live queue, not an oversight.

**This is not a security assessment** and shouldn't read as one. It's QA on a voting product Adam helps run, written to make specific issues fixable.

## Layout

| Path | What's in it |
|---|---|
| `test_cases/` | One page per test case. `BV<id>-<slug>.md` |
| `issues/` | Per-issue notes: findings, resolution, and a copy of whatever was posted upstream |
| `analysis/` | Deep reads of a subsystem — the integration maps that back the test cases |
| `reference/` | Reusable how-to: API checks, commands, gotchas |

## Conventions

- **One test case, one page.** `test_cases/BV240a-notice-appears-on-ballot.md`. Structure: purpose → prerequisites → master data → steps → expected results → pass/fail → actual results → notes → related.
- **Test IDs come from the [test-case sheet](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)**, which stays the canonical index for non-tabulation QA. This repo holds the *detail*; the sheet holds the *roster*. `*-sheet-rows.tsv` files are paste-ready rows for it.
- **Assert on requirements, not on literal strings**, when the copy hasn't been approved yet. A test pinned to unapproved wording fails on every review tweak and trains people to ignore it.
- **Mark predictions as predictions.** If a expected result is derived from reading source rather than from running the product, say so. Two in this repo were later refuted by screenshots.
- **Say when a case is vacuous.** A negative case run against a build where the feature doesn't exist yet proves nothing. Note the required build.

## Related repos

| Repo | Purpose | Visibility |
|---|---|---|
| [star-voting-library](https://github.com/masiarek/star-voting-library) | STAR Voting education — teaching pages, YAML elections, tabulation engines | public |
| [star-voting-research-topics](https://github.com/masiarek/star-voting-research-topics) | Research-paper prospectuses using the library as reproducibility artifact | private |
| **bettervoting-qa** | QA of the BetterVoting product itself | private |
| [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting) | upstream | public |

Tabulation test cases do **not** belong here — they go in `star-voting-library` with a YAML and a frozen BV export, indexed by the auto-generated `BV_registry.md`. This repo is for the QA that has no YAML home: UI, settings, roles, archive, casting, copy.

## Current work

### Wizard "Publish Now" orphans the election (UNFILED — Slack first)

Creating an election through the wizard's **PUBLISH NOW** button while signed out produces one that can never be owned: `claim_key_hash` is written, `owner_id` is left null, so the guest-owner grant can't fire and signing in later can't claim it. It stays `open` and accepting ballots forever; only a `system_admin` can intervene.

Root cause is two lines that disagree in `Wizard.tsx` — `:119` passes `owner_id: null`, `:83` assigns the temp id only when `owner_id` is already non-null. One-line fix.

Verified on production against a same-session control that took the other button:

| | PUBLISH NOW (`jd78xd`) | SEE MORE OPTIONS (`rqq2pw`) |
|---|---|---|
| `owner_id` | `null` | `v-dbg9w2gt` = the `temp_id` cookie |
| `voterAuth.roles` | `[]` | `["owner"]` |
| Owner-only call | `setOpenState` → `401` | `DELETE` → `200` |

Not posted anywhere yet — `owner_id: null` is written deliberately, so it goes to Slack as "is this deliberate?" before it becomes an issue. One gap left in the provenance: the signed-in case is read from source, not run.

→ [`issues/wizard-publish-now-orphans-election.md`](issues/wizard-publish-now-orphans-election.md) · how-to: [`reference/creating-an-election.md`](reference/creating-an-election.md) · lessons: [`reference/automation-gotchas.md`](reference/automation-gotchas.md)

### Flat scores → abstention — why the fix is contested (ANALYSIS, no ticket of its own)

Why Equal Vote hesitate to fix [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407) / [#1053](https://github.com/Equal-Vote/bettervoting/issues/1053), and whether they're right to. Answer: partly. Two of the three stated objections are real, one is false, and the biggest risk is one nobody is discussing (retroactive change to every past election's published numbers).

Key findings, verified by running BetterVoting's own tabulator and captured against production in [BV2263–BV2267](test_cases/BV2263-2267-index.md):

- **Single-winner and Bloc STAR outcomes do not change** — the winner is invariant under the fix, including in the all-flat random-tiebreak case. Only STAR-PR can change a result, via the quota.
- **It is two changes, not one**, and they affect disjoint ballot sets. The half that produces the ugly reporting is the larger, higher-blast-radius half (it also moves Approval, Plurality, IRV and STV).
- **[#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) is a prerequisite**, not a low-priority sibling: it is a live zero-denominator bug whose trigger set today's abstention rule merely *narrows*, and which any fix would widen. It surfaces as `NaN%` in the runoff **table**; the pie chart renders blank instead — both confirmed in a browser by [BV2264](test_cases/BV2264-nan-in-runoff-table.md).

→ [`analysis/flat-scores-abstention/`](analysis/flat-scores-abstention/) · baselines: [`test_cases/BV2263-2267-index.md`](test_cases/BV2263-2267-index.md) · upstream reference cases: [Flat scores, ties & tie-breaking](https://masiarek.github.io/star-voting-library/01_STAR/03_Criteria/Flat_scores_ties/index.html)

Filed upstream from this work: [#1470](https://github.com/Equal-Vote/bettervoting/issues/1470) (write-in discards ballots, live repro), [#1471](https://github.com/Equal-Vote/bettervoting/issues/1471) (chart split denominator), plus root-cause comments on [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035#issuecomment-5166192037) and [#1053](https://github.com/Equal-Vote/bettervoting/issues/1053#issuecomment-5166296842).

### #1350 — Add a disclaimer related to preliminary results (OPEN, assigned to Adam)

The active piece. Four independently landable deliverables:

| | Deliverable | Status |
|---|---|---|
| i | `en.yaml` copy rewrite + `learn_link` to the help article | ready — no sign-off needed |
| ii | On-ballot notice, visible before the voter casts | needs Q1 |
| iii | Extra warning layer for closed-list elections | **blocked on Q2** (wording approval) |
| iv | Qualify the help article's L26 claim | doc review |

Key finding: the article is **already written** (`docs/help/preliminary_results.md`, on `main`) and linked from nowhere in `packages/`. This is a linking + copy task, not a writing task.

- Analysis: [`analysis/preliminary-results-integration-map.md`](analysis/preliminary-results-integration-map.md)
- Test cases: [`test_cases/BV240-index.md`](test_cases/BV240-index.md) — BV240a–p, 2 of 16 written up in full
- Posted upstream: [`issues/1350-disclaimer-comment-posted.md`](issues/1350-disclaimer-comment-posted.md) → [comment](https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974)

### #1043 / BV230 — Show Preliminary Results after finalize (RESOLVED, awaiting close)

Not reproducible on current production. Retested 2026-07-29 as BV230-r1 (`yyvwrj`). All three fixes proposed in the 2025 thread shipped independently — see [`issues/1043-show-preliminary-results.md`](issues/1043-show-preliminary-results.md).

### #1353 — Public audits vs. immutability (OPEN)

The change history is already in the database (`electionDB` has been append-only since Jan 2024), but actor and reason are discarded. PR #1365 (`JacksonLoper/publicaudit`) already implements the read endpoint and page with no migration — **this is a review, not a build.**

### #1420 — JSON export leaks internal object shape (OPEN, Adam's)

v2 export format. In flight on the local `feature/clean-json-export` branch. Note: once v2 ships, `fetch_bv_export.py`'s "byte-equivalent to the UI export" property in the `bettervoting` skill becomes false — the script reads the API, the button emits v2.

## Open questions waiting on upstream

From the #1350 comment, in priority order:

1. **Q2 — who approves the closed-list warning wording?** Blocks BV240c and BV240d. The issue's framing ("extra trivial for them to reveal what those votes are") overstates what the code allows.
2. **Q7 — should #1350 be split four ways?** Would let deliverable (i) land immediately.
3. **Q5 — the mid-election flip.** `setPublicResults` has no state guard, so a voter can be shown a ballot with results hidden and have that change under them. Copy can't fix it.
4. **Q4 — should `getAnonymizedBallots` be unauthenticated in any state?** One anonymous GET returns full ballots by stable id. The creation wizard turns the flag on by default and never shows the creator that choice.
