# Handoff — 2026-07-30

Everything from the 29–30 July session, and how to pick it up on another machine.

## Get it all with three clones

```bash
# 1. This repo — QA test cases, analysis, issue notes  (public)
git clone https://github.com/masiarek/bettervoting-qa.git

# 2. The BetterVoting fork, with both feature branches
git clone https://github.com/masiarek/star-server.git
cd star-server
git fetch origin
git checkout fix/preliminary-results-tip-copy      # PR #1465
git checkout feat/preliminary-results-ballot-notice # PR #1466

# 3. Upstream, if you want main
git remote add upstream https://github.com/Equal-Vote/bettervoting.git && git fetch upstream
```

## Open pull requests

| PR | Branch | State | What |
|---|---|---|---|
| [#1465](https://github.com/Equal-Vote/bettervoting/pull/1465) | `fix/preliminary-results-tip-copy` | ready | The admin tip rewrite: new copy, `\|`→`>` so it renders as one paragraph, plus `learn_link` to the help article. 5 lines. |
| [#1466](https://github.com/Equal-Vote/bettervoting/pull/1466) | `feat/preliminary-results-ballot-notice` | **draft** | The on-ballot notice + closed-list layer + the submit-dialog line. ~70 lines across 4 files. |

Both branched off upstream `main` at `8d2b3f9a`.

**#1466 is a draft for one reason:** the closed-list wording is a privacy claim about BetterVoting printed on a ballot, and someone who owns messaging should sign that sentence. Everything else in it is verified.

## Issues touched

- **[#1350](https://github.com/Equal-Vote/bettervoting/issues/1350)** — you're assigned. Three comments posted: the [analysis](https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974), the [test-plan link](https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5129794398), and availability/ETA (8 hrs this week, target 12 Aug).
- **[#1043](https://github.com/Equal-Vote/bettervoting/issues/1043)** (BV230) — [closing comment posted](https://github.com/Equal-Vote/bettervoting/issues/1043#issuecomment-5125655744). Not reproducible; still open pending a view on the `is_public` half. You can close it.
- **[#1420](https://github.com/Equal-Vote/bettervoting/issues/1420)** — your v2 JSON export issue, unchanged. Note: when v2 ships, `fetch_bv_export.py`'s "byte-equivalent to the UI export" claim in the `bettervoting` skill becomes false.

## To pick up where we left off

**The code is done.** What remains is mostly other people's decisions rather than your hours — roughly **1–2 hours of real work**, plus half a day if you want the Playwright automation.

| # | What's left | Effort | Blocked on |
|---|---|---|---|
| 1 | **Attach the tooltip screenshot to #1465** — the As-Is three-line rendering. It makes the `\|`→`>` change self-evident; without it the diff reads as YAML pedantry. Then #1465 is mergeable. | ~10 min | you |
| 2 | **Get the closed-list wording signed off** (Q2). Gates BV240c, BV240d, and taking #1466 out of draft. It's a five-minute conversation, not work — the sentence is already written and deliberately claims only what the code supports. | ~5 min to ask | **Arend** |
| 3 | **Answer Q7** — split #1350 four ways? Would let #1465 merge independently of the rest. | ~0 | Arend |
| 4 | **Qualify the help article's L26 claim** — `docs/help/preliminary_results.md` says BetterVoting hides the voter↔ballot link. True of the API, needs a caveat for the deployment. Do this in the same pass as reporting the Matomo finding, since they're the same fact. | 30–60 min | you (after #4 in the findings file is raised) |
| 5 | **Report the four findings** in the file named below. Slack, one at a time. Item 4 there (Matomo) unblocks row 4 above. | ~30 min | you |
| 6 | **Playwright specs for the new cases** — 11 of the 16 are automatable, the harness exists, and `full-runthrough.spec.ts:51-57` has the `aria-pressed` settle idiom to copy. Entirely optional; nothing depends on it. | 3–4 hrs | you |
| 7 | **BV240o** (non-English fallback) and **BV240p** (two-browser mid-election flip) — the two manual cases the local stack couldn't cover. | ~30 min together | you |
| 8 | **Change the Gmail passwords** — decouple them from the BetterVoting one. Unrelated to #1350; see the note at the bottom. | ~15 min | you |

Against the 8 hrs/week and 12 Aug target posted on the issue, you're well ahead. The remaining calendar time is review latency, not effort.

**Deliberately not doing:** changing `util.tsx`'s global `_self` default for markdown links. It would fix the same class of problem everywhere, but it affects existing tips (e.g. `random_tie_order`) and is scope creep on #1350. Separate ticket if anyone wants it.

## Not in this repo — copy it before you switch machines

`/Volumes/T7/Voting/BetterVoting/bv-security-findings-unreported.md`

Four unreported data-access findings, deliberately kept out of this public repo until they've been raised with the maintainers. **This file exists nowhere else — it is not in any git repo.** Copy it to wherever you keep things, or it's gone when you switch.

The sharpest is `editElectionRolesController`'s commented-out draft guard. Slack rather than public issues, one at a time, framed as "is this deliberate?".

## Local-only leftovers you can discard

| Path | What | Keep? |
|---|---|---|
| `bv-copy-fix/` | worktree for the #1465 branch | no — branch is pushed |
| `bv-ballot-notice/` | worktree for the #1466 branch, plus 681 MB of `node_modules` | no — branch is pushed |
| `bvnotice-db` container | throwaway Postgres on 5433, seeded then hand-edited | no — `docker rm -f bvnotice-db` |

Two npm dev servers (backend 5055, frontend 3000) were backgrounded from the session and die with it.

To rebuild the local stack on the new machine: clone the fork, `npm install`, `npm run build -w @equal-vote/star-vote-shared`, run Postgres from `test-data.sql`, then the backend and frontend dev servers. The seeded `4xtfb4` election is configuration E1 out of the box (`state=open`, `public_results=true`, `voter_access=open`), so no login or election creation is needed to see the notice.

## What got verified, and what didn't

Seven of the sixteen BV240 cases have empirical backing from a running stack: **a, b, c** (structure), **e, g, j, k**. The submit-dialog line is verified too.

Not verified: the non-English locales, and the two-browser mid-election flip (BV240p).

Four of my own claims were **wrong** and got corrected by checking — recorded in the pages so they don't get re-inherited:

1. BV240h's article URL was marked an unverified prediction; it returns 200.
2. BV240o claimed the new keys create translator work. The *banner* keys don't (PRIORITY 99, beside `draft_warning`). The *dialog* key does (PRIORITY 0).
3. A first "history rewrite" of this repo left a credential in `b4fcff7`, and my own verification misread the hits as harmless. Now genuinely one clean commit.
4. I said the two existing Playwright specs would need selector updates. A read of them says otherwise — all selectors are role-plus-accessible-name, and the one loose `getByText('open')` runs on Admin Home where the notice doesn't render. Corrected in #1466 and in three case pages.

Also worth knowing: the test-account credential was briefly public in this repo's history. The dangling commit `00dbb72` may still be reachable by SHA on GitHub — deleting and recreating the repo would purge it.
