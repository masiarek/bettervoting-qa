# #1507 — the IRV mirror-image gap, comment posted

**Posted:** 2026-08-20 → [issuecomment-5369326181](https://github.com/Equal-Vote/bettervoting/issues/1507#issuecomment-5369326181)

Posted on [#1507](1507-star-pr-tiebreaktype-always-random.md) — our Allocated Score `tieBreakType` issue — rather than as a new issue: a comment is fine under the PR freeze, and the two defects are one field read in opposite directions. GitHub's mention backlink also puts it on the timeline of [#1432](https://github.com/Equal-Vote/bettervoting/issues/1432), the tie-break-transparency ask it qualifies.

## What it said

- `IRV.ts` sets `tieBreakType = 'random'` in exactly two places: the candidate reaching quota is tied with the runner-up (`L114–116`), or an elimination tie is between the **last two** standing candidates (`L149–151`, `remainingCandidates.length == 1` after the `pop()`). Every other elimination tie — three or more still standing — is resolved by `sortCandidates(remainingCandidates, 'hareScores')` (previous rounds newest-first, `Util.ts L181–184`; then `tieBreakOrder`, `Util.ts L147`) and never flagged. `tied` is never populated by IRV at all (`L45` / `L89`). And the one flagged elimination case says `'random'` whenever the last two are level on the *current* round (`L149` compares only `hareScores.at(-1)`), even if the previous-rounds rung separated them — over-broad where present, absent where it matters most. Line numbers at `main` @ `454a38ae`.
- **Profile A** — previous-rounds rung, against the shuffle order: candidates `[Alice, Carol, Bob, Dave]`; 5 × Alice>Bob>Carol>Dave, 4 × Bob>Alice>Carol>Dave, 3 × Carol>Bob>Alice>Dave, 1 × Dave>Carol>Bob>Alice. Round 2 ties Bob 4 = Carol 4; Carol is eliminated on her lower round-1 total; Bob wins 8–5. `tieBreakType: "none"`, `tied: []`.
- **Profile B** — the shuffle rung picks the winner: `[Ann, Bob, Cal]`; 3 × Ann>Bob>Cal, 2 × Bob>Ann>Cal, 2 × Cal>Bob>Ann. Round 1 ties Bob 2 = Cal 2 with no previous round; `tieBreakOrder` eliminates Cal and Bob wins 4–3 — had it eliminated Bob, Ann wins 5–2. `tieBreakType: "none"`, `tied: []`.
- The results page reads the same field both ways (`Results.tsx:444`, `['random','five_star','head_to_head'].includes(results.tieBreakType)` for every non-STAR method): an IRV race decided by the shuffle renders as an ordinary win; every STAR-PR race renders as "Tied! … won after tiebreaker" — live on `bvhchj` today, seven rounds each with a unique maximum.
- Fix shape: record the tie where it is broken (the elimination branch, or `sortCandidates` itself), and distinguish the previous-rounds rung from the random one if the type is meant to carry a rung. Offered to split into its own issue if the maintainers prefer.

## Verification

A scratch jest file in `bv-copy-fix` (`packages/backend`, `npx jest <file> --forceExit`, `main` @ `454a38ae`), three tests each written to *fail* on the defect: the #1507 Sandbox profile → `random`, `tied: [Ada, Cara]`; profile A → `none`; profile B → `none`. 3 failed / 3, as expected. The file was deleted afterwards; the profiles above are the whole of it. The "Tied!" heading on `bvhchj` was read from the rendered page and screenshotted the same day — the earlier [#1507 write-up](1507-star-pr-tiebreaktype-always-random.md) had it from the API and the source only.

## Note

This was nearly a duplicate. The finding arrived as a follow-up chip reading "not yet filed upstream"; the pre-filing claims check (per-issue `bv-*` clones, PARKED §7, the star-voting-library ledger, peer sessions) found #1507 — our own, eleven days old, fix already parked. The ledger row and `07_Concepts/tabulation_engines/tiebreak_ladders.md` in [star-voting-library](https://github.com/masiarek/star-voting-library/blob/master/07_Concepts/about_this_repo/upstream_bug_reports.md) now cite it. The bloc driver keeping only the final seat's `tieBreakType` (`Util.ts:312`), noted on the #1507 page as a sibling for its own issue, was filed later the same day as [#1582](https://github.com/Equal-Vote/bettervoting/issues/1582) ([record](1582-bloc-final-seat-tiebreaktype-filed.md)).
