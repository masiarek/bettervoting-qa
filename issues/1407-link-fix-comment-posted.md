# #1407 / #884 — link fix posted 2026-08-02

Two comments posted upstream, both purely corrective — no new argument, no new tickets.

- [#1407 comment](https://github.com/Equal-Vote/bettervoting/issues/1407#issuecomment-5161778279)
- [#884 comment](https://github.com/Equal-Vote/bettervoting/issues/884#issuecomment-5161778346)

**Both were posted wrong the first time and edited in place.** See *"How this went wrong twice"* below — the failure mode is worth keeping, because it will recur.

## Why

@jacksonloper commented on #1407 on 2026-07-15: *"getting 404s from those links"*. The thread has been silent since. All four evidence links in the issue body were dead, so the issue had no readable basis. The same rename killed the index link in the #884 comment.

## What the comments now link to

**Published-site URLs, not `blob/master/...`.** The site is built with `mkdocs-redirects`, so a moved page keeps serving from its old URL. Repo blob URLs have no such redirect and break on every reorganisation. For evidence cited in a long-lived issue thread, the site is the durable surface.

| Posted on | Original (dead) | Now links to |
|---|---|---|
| #1407 | `YAML/blob/master/01_Single_winner/pet_real_bv_election/small_abstention_c2_b5_lesson.md` | [site](https://masiarek.github.io/star-voting-library/01_STAR/04_Real_Elections/pet_real_bv_election/small_abstention_c2_b5_lesson.html) |
| #1407 | `.../01_Single_winner/pet_real_bv_election/small_case_abstention_lesson.md` | [site](https://masiarek.github.io/star-voting-library/01_STAR/04_Real_Elections/pet_real_bv_election/small_case_abstention_lesson.html) |
| #1407 | `.../01_Single_winner/runoff_overturns_leader/Runoff_07_flat_ballot_bv_bug_tf73v9.md` | [site](https://masiarek.github.io/star-voting-library/01_STAR/04_Real_Elections/runoff_reversal_bv_cases/Runoff_07_flat_ballot_bv_bug_tf73v9.html) |
| #1407 | `.../01_Single_winner/pet_real_bv_election/LH_BV_reconciliation_issue.md` | [site](https://masiarek.github.io/star-voting-library/01_STAR/04_Real_Elections/pet_real_bv_election/LH_BV_reconciliation_issue.html) |
| #1407 | *(added)* the flat-score case set | [Flat scores, ties & tie-breaking](https://masiarek.github.io/star-voting-library/01_STAR/03_Criteria/Flat_scores_ties/index.html) |
| #884 | `.../00_start_here/tabulation_engines/BV/abstain_issues_index.md` | [site](https://masiarek.github.io/star-voting-library/07_Concepts/tabulation_engines/BV/abstain_issues_index.html) |
| #884 | `.../01_STAR/abstain_bugs/bv11_6xhfp8_full_equal_support.md` | [site](https://masiarek.github.io/star-voting-library/01_STAR/04_Real_Elections/abstain_bugs/bv11_6xhfp8_full_equal_support.html) |

All seven verified by fetching the page and reading the rendered `<title>`.

## How this went wrong twice

Worth writing down, because both traps are silent.

**Trap 1 — GitHub serves its repo-scoped 404 page with HTTP 200.** When a path is missing inside a repo that *does* exist, you get the "404 — page not found" page rendered inside the repo chrome, and the response status is `200`. So `curl -o /dev/null -w '%{http_code}'` reports success on a dead link. Every link "verified" that way was unverified.

> **Check blob URLs against the git tree, never against HTTP status:**
> ```bash
> gh api "repos/OWNER/REPO/git/trees/BRANCH?recursive=1" --jq '.tree[].path' | grep -qxF "the/path.md"
> ```

**Trap 2 — GitHub code search is stale.** `gh search code` returned the pre-reorganisation paths. It indexes on a lag, so it will happily hand you paths that no longer exist.

**Trap 3 — the tree moved mid-session.** `d3be917` *"Reorganize each method folder into a fixed, ordered teaching spine"* landed on `star-voting-library` at 02:39 UTC on 2026-08-03, between the first path lookup and the comment being posted. `01_STAR/Flat_scores_ties/` → `01_STAR/03_Criteria/Flat_scores_ties/`, `01_STAR/abstain_bugs/` → `01_STAR/04_Real_Elections/abstain_bugs/`, and the `pet_real_bv_election` / `runoff_reversal_bv_cases` folders gained the same `04_Real_Elections/` prefix.

This is the structural point: **`blob/master/...` links into `star-voting-library` are not safe to publish**, because the teaching spine gets reorganised. The published site is, because it carries redirects. Anything cited upstream should use the site.

## Link checker

`/tmp/lc.sh` in the session transcript does this properly — blob URLs against the git tree, site URLs by following the `mkdocs-redirects` meta-refresh and judging the rendered title. Worth promoting into `reference/` if link rot keeps happening.

## Worth doing once

Any other upstream comment linking `masiarek/YAML/blob/master/...` — or any `star-voting-library/blob/master/...` path under a folder that has since moved — is silently broken the same way. A sweep of Adam's comment history would catch the rest. **Not done yet.**

## Not posted

The analysis in [`analysis/flat-scores-abstention/`](../analysis/flat-scores-abstention/) — the two-edits split, the verified winner-invariance result, #1035 as a prerequisite, and the `ResultsBarChart` split-denominator bug — was deliberately held back. Adam's call, 2026-08-02: fix the links first, decide on the argument separately.
