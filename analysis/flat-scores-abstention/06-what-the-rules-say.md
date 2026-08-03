# 06 — What STAR's own rules and election standards actually say

The first five pages are engineering: what the code does, what breaks, what it would cost. This one is the other half of the question — **is "all-equal = abstention" defensible as policy?** — because #884 was decided as a policy call, not a bug fix, and it can only be revisited on that ground.

Short answer: **no published STAR rule supports removing an all-equal ballot from the tally, and Equal Vote's own prior engine doesn't do it either.** Every authoritative text that touches the question describes an equal-scores ballot as a *counted vote* whose runoff status is "no preference", and defines the abstention-like category by the **marked/unmarked** line, never the **flat/non-flat** line.

> **Provenance.** The standards and rules research on this page was produced by a separate research pass and is cited to primary URLs; I have not personally opened every one. The two claims I verified myself from source are marked **✅ verified here**. Items the research flagged as unverified are carried through as unverified rather than quietly dropped.

---

## 1. STAR's published canon

| Source | What it says |
|---|---|
| **Eugene Measure 20-349** ([charter text](https://www.starvoting.org/eug_initiative_text)) — the only STAR text ever put to voters as law | Scoring round sums scores "from all ballots". In the runoff, a voter who gave both finalists the same score "will be considered a vote of **'no preference'** between the finalists" — *a vote*, in enacted legal language |
| **Ballot instructions** (same text, mirrored on sample ballots) | "Equal scores indicate no preference" · "Candidates left blank receive zero stars" |
| **[STAR FAQ](https://www.starvoting.org/faq)** · **[equal preference](https://www.starvoting.org/equal_preference)** | An equal-preference vote in the runoff **is counted**, according to the voter's intent to support or oppose both finalists equally |
| **[Hand-count protocol](https://docs.bettervoting.com/help/hand_count.html)** | Runoff ballots are sorted into exactly **three piles** — one per finalist, one for no-preference. No step sets any ballot aside |
| **Technical Specifications V1.3** (linked from [technical_specifications](https://www.starvoting.org/technical_specifications)) | *Equal Preference* = a property of "a ballot in the STAR Voting runoff". *Undervote* = a voter who "gave no scores to any of the candidates for another race". **The line for non-participation is "no scores given", not "equal scores given."** Reporting requirements include "the number of votes cast for the election as a whole and (if different) for each race" — the spec already anticipates two denominators |
| **Wolk, Quinn & Ogren**, *Constitutional Political Economy* 34:310–334 (2023) ([paper](https://link.springer.com/article/10.1007/s10602-022-09389-3)) | Ballots scoring both finalists equally count as a vote of "no preference" in the runoff. The word "abstention" does not appear |

**Where the canon is genuinely silent:** no official document says whether an all-equal *scored* ballot counts toward the reported number of voters in a race. The question as BetterVoting posed it is never asked. But the silence is bounded — the only definitions on the books point one way, and no text anywhere contemplates removing a marked ballot from any total.

**The strongest textual case for #884** is the instruction "equal scores indicate no preference", extended from a statement about *two finalists* to a statement about *the whole ballot*. That extension is BetterVoting's, not the canon's, and it collides with the same FAQ's insistence that such votes are counted.

## 2. Equal Vote's own engine disagrees ✅ verified here

[`Equal-Vote/starpy`](https://github.com/Equal-Vote/starpy) — Equal Vote's own Python STAR implementation — has **no abstention handling at all**. Read from `starpy/STAR.py`:

```python
score_sums = ballots.sum()                                     # every row contributes
preference_matrix.loc[a][b] = (ballots.loc[:][a] > ballots.loc[:][b]).sum()   # strict preference only
```

The score round sums every ballot row with no filter, and the pairwise matrix counts only *strict* preferences — so a ballot scoring two candidates equally contributes to neither side, which is exactly Equal Support semantics. There is no abstention, blank, or all-equal test anywhere in the file.

**This matters for the argument.** #884 is usually discussed as "BetterVoting vs. Larry Hastings' engine", which frames it as a house-style disagreement with an outside implementation. It isn't: **#884 also diverged from Equal Vote's own prior reference implementation.** Three engines — starpy, `starvote`, and the hand-count protocol — agree with each other and not with the current BetterVoting rule.

## 3. Election-administration standards

The concept that resolves this is standard and old: **ballots cast (turnout)** vs. **valid votes in a contest (the contest denominator)**. They are separate numbers, both reported, and neither is produced by deleting records.

| Standard | Relevant content |
|---|---|
| **NIST SP 1500-103**, Cast Vote Records CDF ([pages.nist.gov/CastVoteRecords](https://pages.nist.gov/CastVoteRecords/)) | `ContestStatus` enumeration includes `not-indicated` ("no marks or other indications"), `undervoted`, `overvoted`, `invalidated-rules`. A contest the voter skipped **still gets a `CVRContest` record with a status** — non-participation is a status on a record, never deletion of the record |
| **NIST SP 1500-100**, Election Results Reporting CDF ([pages.nist.gov/ElectionResultsReporting](https://pages.nist.gov/ElectionResultsReporting/)) | Separates `BallotCounts` (BallotsCast, BallotsOutstanding, BallotsRejected) from per-contest `VoteCounts` — two denominators, both first-class |
| **VVSG 2.0** (via the EAC's [Supported VVSG 2.0 Functionality](https://www.eac.gov/sites/default/files/2025-03/Attachment%20A%20-%20Supported%20VVSG%202.0%20Functionality.pdf) table) | Systems must report counted ballots by contest, overvotes per contest, and undervotes per contest — reqs 1.1.9-E / -G / -H. That mandated report *is* the triple counted / with-preference / without-preference. ⚠️ *Requirement IDs read from the EAC table, not checked against the VVSG 2.0 text itself* |
| **[NIST Election Glossary](https://pages.nist.gov/ElectionGlossary/)** | *undervote*, *blank ballot*, *counted ballot*, *residual vote* — every one defined by **marks**, not by mark *pattern*. No standard classifies "marked every option identically" as not voting |
| **Maine 21-A M.R.S. §723-A** ([text](https://www.mainelegislature.org/legis/statutes/21-A/title21-Asec723-A.html)) | The closest live analogy. Exhausted ballots leave the *round* denominator but never the ballots-cast total |
| **NYC 2021 Democratic mayoral primary** ([coverage](https://gothamist.com/news/first-citywide-ranked-choice-primary-in-nyc-saw-a-higher-rate-of-exhausted-primary-ballots)) | ~942,000 certified ballots; 140,202 (14.9%) reported as "inactive" in the final round — published as a **named category**, turnout unchanged |

**Applied to STAR**, this gives a natural three-layer report that maps one-to-one onto the standards *and* onto the hand count's three piles:

1. **ballots cast** in the election — turnout
2. **ballots counted in this race** — anything with a mark; the complement is the undervote, per both NIST and Equal Vote's own spec
3. **ballots expressing a preference between the finalists** — the runoff denominator; the complement is "no preference"

BetterVoting currently collapses all three into one number by deleting rows — the one operation with no precedent in any of the above.

**Concrete casualty:** results from the BetterVoting tabulator **cannot be reconciled against Equal Vote's own hand-count procedure**, because the hand count's three piles sum to ballots cast and BetterVoting's reported voter total does not.

## 4. The steelman for the current rule — which must survive any fix

This is real and any proposal has to keep it solved.

A low-salience race inside a larger election: 500 ballots; 100 score X over Y, 80 score Y over X, **320 leave the race entirely blank**. Naive "count everything into Equal Support" shows X = 100, Y = 80, Equal Support = 320 — the tallest bar says *"most voters liked both equally"*, which is false; they never engaged. And the winner's share reads 100/500 = 20%, inviting a bogus "no mandate" attack.

The current rule reports 180 voters, X 56% – Y 44%: an honest picture of the contested race. That is exactly the #884 rationale — keep Equal Support meaning *engaged voters genuinely indifferent between the finalists*.

**The fix is therefore not to pick a side.** It is to stop making one number carry both meanings — which is what Option D in [`04-options.md`](04-options.md) does, and what splitting the Equal Support bar into *"scored the finalists equally"* vs. *"skipped this race"* does.

## 5. The quorum hazard — the practical case nobody has raised

The winner is invariant ([`02-blast-radius.md`](02-blast-radius.md)), so it is tempting to file all of this as cosmetic. It isn't, once a number other than the winner is load-bearing.

An 80-member organisation, bylaws quorum *"50% of members must vote"*. Two well-liked nominees. 44 members vote: 30 ballots `A5 B5`, 8 ballots `A5 B3`, 6 ballots `A2 B4`.

| | Full data | BetterVoting today |
|---|---|---|
| Voters reported | 44 | **14** |
| Score totals | A 202, B 198 | A 52, B 48 |
| Runoff | A 8, B 6, no preference 30 | A 8, B 6 |
| Five-star support | A 38/44 (86%), B 30/44 (68%) | erased |
| **Quorum (needs 40)** | **met — 44** | **failed — 14** |

Same winner. But the published record turns a 55%-turnout election between two well-liked nominees into a 52–48 squeaker among 14 voters that **flunks quorum** — and 30 members who five-starred both nominees get receipts saying they abstained.

Any organisation using BetterVoting with a turnout-based quorum, ratification threshold, or "majority of the membership" rule in its bylaws is exposed to this today. That is a governance consequence, not a chart.

## 6. It also undermines STAR's own majority claim

STAR's headline claim is carefully hedged: the winner has a majority among voters *who had a preference* ([starvoting.org/majority](https://www.starvoting.org/majority)).

Deleting the no-preference voters makes that claim **unverifiable from the published results** — the "voters who had a preference" denominator is presented as if it were all voters. The current rule silently converts a hedged claim into an unhedged one, which is precisely the move STAR's critics attack. Counting the ballots and reporting the denominator restores the hedge and makes it checkable.

## 7. What other implementations do

| Implementation | Rule | Status |
|---|---|---|
| **BetterVoting** | All-equal (incl. all-null, all-0, all-3, all-5) removed entirely | ✅ verified here by execution |
| **[Equal-Vote/starpy](https://github.com/Equal-Vote/starpy)** | **No special-casing.** Voters = row count; runoff = strict-preference sums; flat ballots counted | ✅ verified here from source |
| **[larryhastings/starvote](https://github.com/larryhastings/starvote)** | Unscored = 0; every ballot examined in both rounds, none discarded; equal score = no preference between those candidates | verified from README |
| **Equal Vote Google Sheets tabulator** | Silent on abstention/blank; voter count is an operator-set multiplier | page verified silent |
| **[rangevoting.org](https://rangevoting.org/) lineage** | The instructive contrast: abstention is an explicit per-candidate mark the **voter** makes — never inferred by the tabulator from a score pattern | verified |
| star.vote (legacy), electowidget, abcvoting | — | **unverified** |

Note the last row of substance: in the one score-voting tradition that *does* have real abstention semantics, abstention is something a voter explicitly marks. STAR deliberately removed that mechanism by defining blank = 0 ([blank_vs_zero](https://www.starvoting.org/blank_vs_zero)). Reintroducing abstention *by inference from the score pattern* reverses that design decision without saying so.

## 8. The framing that doesn't require relitigating #884

> #884 got the **bucket semantics** right — "Equal Support" should mean voters who engaged with the ballot but not between the finalists. Its receipt language and its treatment of the voter total simply overshot that rationale. The stated goal is fully achieved by *bucketing*, and is not achieved *better* by *deletion*; deletion only adds the 0-voters absurdity, the quorum hazard, the unreconcilable hand count, and a receipt telling a five-stars-for-everyone voter they abstained — the part already conceded to feel weird in #1053.

Concretely: keep the Equal Support bar defined exactly as #884 wanted, adopt the three-number report (Option D), and change the receipt to say what actually happened — the ballot was counted, it supported every candidate at the given level, and it expressed no preference between the finalists.

Every source on this page is precedent for that shape. None is precedent for the current one.

## 9. A substrate worth considering: status, not deletion

Store a per-ballot-per-race **status** modelled on NIST's `ContestStatus` — `counted-with-preference` / `counted-no-preference` / `not-indicated` — and never drop a row. Derive every displayed denominator from statuses at render time.

This is the same shape as the two edits isolated in [`04-options.md`](04-options.md): stop deleting first, then choose labels. Its value is that future disagreements become **label disputes rather than tabulation disputes** — which is the actual lesson of the last year on this topic.

## 10. Still unverified

Carried through honestly rather than dropped: star.vote's legacy behaviour; electowidget's score handling; abcvoting's library-level treatment of empty ballots; VVSG requirement IDs (read from the EAC functionality table, not the VVSG text); and the Technical Specifications V1.3 quotations, which come from the linked PDF and are worth a second read before being quoted upstream.
