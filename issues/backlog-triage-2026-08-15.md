# Backlog triage — 386 open issues, 2026-08-15

A full pass over every open issue on [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting/issues), asking one question: **can this be closed today?** Five parallel readers took ~78 issues each; every closure recommendation was then re-verified by hand against `origin/main` before anything was posted upstream.

**Result: 24 recommended for closure, 23 blocked on an open PR, ~20 unclear, the rest still valid.** Comments carrying the evidence were posted on the 24.

## The closeable set

### Done, but the issue never got closed

| Issue | Evidence |
|---|---|
| [#1405](https://github.com/Equal-Vote/bettervoting/issues/1405) Remove WizardExtra | `WizardExtra.tsx` gone from main (`3ea8063b`). PR #1438's title said "(#1405)" — a bare reference, not a closing keyword |
| [#216](https://github.com/Equal-Vote/bettervoting/issues/216) Candidate photos | PR #1216 merged **with** a closing keyword; maintainer's last comment is *"I'll resolve this"* |
| [#1353](https://github.com/Equal-Vote/bettervoting/issues/1353) Public audit log | Shipped as PR #1365 — controller, view, formatter and tests all on main |
| [#1182](https://github.com/Equal-Vote/bettervoting/issues/1182) Clear voter roll API | `clearElectionRollController.ts` + `DELETE /Election/:id/rolls/` + tests |
| [#1099](https://github.com/Equal-Vote/bettervoting/issues/1099) Ballot timing deanonymisation | Scrub + `secureShuffle`; the code comment names this threat model |
| [#808](https://github.com/Equal-Vote/bettervoting/issues/808) CSV comma escaping | RFC-4180 `csvField()` at `BallotDataExport.tsx:34` |
| [#655](https://github.com/Equal-Vote/bettervoting/issues/655) Show commit sha | `About.tsx:73-82`, wired through the Docker build |
| [#879](https://github.com/Equal-Vote/bettervoting/issues/879) Method name on results | `results.method_context` under the winner line |
| [#869](https://github.com/Equal-Vote/bettervoting/issues/869) swagger.json committed | Not in the tree; gitignored and generated |
| [#625](https://github.com/Equal-Vote/bettervoting/issues/625) Blank pasted voter rows | `filter(row => row.trim())`, commit `3e636f84` |
| [#603](https://github.com/Equal-Vote/bettervoting/issues/603) pairwiseMatrix | Removed in the 2025 refactor, replaced by `winsAgainst` |
| [#1437](https://github.com/Equal-Vote/bettervoting/issues/1437) Download needs many clicks | PR #1428 keeps one menu mounted through loading |
| [#666](https://github.com/Equal-Vote/bettervoting/issues/666) Numbered runoff step | String gone since `2f9560d2` |
| [#360](https://github.com/Equal-Vote/bettervoting/issues/360) NaN in bloc | Re-ran the issue's exact ballots through today's tabulator: no NaN |
| [#470](https://github.com/Equal-Vote/bettervoting/issues/470) Tabs on admin ballot view | The view was deleted as orphaned code |
| [#1013](https://github.com/Equal-Vote/bettervoting/issues/1013) Ballot download restriction | Guard shipped via #995 |

### Closed by the reporter's or maintainer's own words

[#1188](https://github.com/Equal-Vote/bettervoting/issues/1188) (*"works now — user error"*), [#1379](https://github.com/Equal-Vote/bettervoting/issues/1379) (*"can be closed as WAI"*), [#495](https://github.com/Equal-Vote/bettervoting/issues/495), [#638](https://github.com/Equal-Vote/bettervoting/issues/638) (*"probably over engineering"*), [#741](https://github.com/Equal-Vote/bettervoting/issues/741), [#1078](https://github.com/Equal-Vote/bettervoting/issues/1078), [#906](https://github.com/Equal-Vote/bettervoting/issues/906).

### Duplicates and consolidations

[#1444](https://github.com/Equal-Vote/bettervoting/issues/1444) → #1471 · [#1062](https://github.com/Equal-Vote/bettervoting/issues/1062) → #1036 · [#1114](https://github.com/Equal-Vote/bettervoting/issues/1114) ↔ #806 · [#1175](https://github.com/Equal-Vote/bettervoting/issues/1175) → #1174 · [#1065](https://github.com/Equal-Vote/bettervoting/issues/1065) → #1052 · [#1073](https://github.com/Equal-Vote/bettervoting/issues/1073) → #884/#1086.

## Three traps this pass hit — worth knowing before running it again

**1. Dependabot changelogs poison a "merged PR references issue #N" query.** 44 open issues looked like they were referenced by a merged PR; **40 were false positives** — the PR bodies are dependency changelogs quoting the *upstream package's* issue numbers. Filter to non-dependabot authors first, or the signal is buried 10:1.

**2. A merged PR with a closing keyword does not guarantee the issue closed.** #216 and #1170 both had one and both stayed open. Conversely #1405 was done and open only because the reference was in the PR *title* as "(#1405)" instead of "Closes #1405". **Neither direction can be trusted; check the issue state itself.**

**3. Title similarity finds template families, not duplicates.** "Onboarding Issue: Developer: X" and "Add @X to the contributor list" score as near-duplicates of each other while being deliberately separate per-person trackers. Every genuine duplicate found here needed the *body* read.

## Also found: PRs that will not close what they fix

Seven open PRs reference an issue with no closing keyword, so merging them closes nothing: **#1441**→#1440 (worst case — the PR body has *no* issue reference at all, the link exists only in a comment), #1504→#820, #1476→#762, #1466→#1350, #1475→#904/#912, #1492→#1420/#1432, #1524→#1059.

## Scale of what remains

- **114 open issues have zero comments** — never discussed by anyone. 27 of those predate 2025.
- The nine tiny doc edits on the PR-guide page (#1172–#1181) are **all still unapplied** — verified string by string. They are the repo's only stock of genuine first-timer tasks and were deliberately left alone.
- #1160's thread claims a dual CSV export was implemented in #1419. **PR #1419 was closed unmerged** — only its escaping fixes survived, via #1428. That stale claim will mislead the next triager.
