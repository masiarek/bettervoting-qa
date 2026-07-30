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

**Landable now, no one's approval needed:** #1465. It's ready; it just wants your tooltip screenshot attached showing the current three-line rendering.

**Blocked on Arend:** the closed-list wording (blocks BV240c, BV240d and un-drafting #1466), and whether to split #1350 four ways.

**Not started:** qualifying the help article's L26 claim that BetterVoting hides the voter↔ballot link — true of the API, needs a caveat for the deployment. Tied to a finding not yet reported (below).

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

Three of my own claims were **wrong** and got corrected by checking — recorded in the pages so they don't get re-inherited:

1. BV240h's article URL was marked an unverified prediction; it returns 200.
2. BV240o claimed the new keys create translator work. The *banner* keys don't (PRIORITY 99, beside `draft_warning`). The *dialog* key does (PRIORITY 0).
3. A first "history rewrite" of this repo left a credential in `b4fcff7`, and my own verification misread the hits as harmless. Now genuinely one clean commit.

Also worth knowing: the test-account credential was briefly public in this repo's history. The dangling commit `00dbb72` may still be reachable by SHA on GitHub — deleting and recreating the repo would purge it.
