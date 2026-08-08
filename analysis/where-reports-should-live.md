# Where reports should live — BV or the library

Decision note. Governs what we ask BV for, and what we build ourselves.

The question was posed as a binary — *bypass BV and build reports in the library, or get BV to build reports we cross-check?* Neither. The right cut is **whether the data can leave BV at all**, and that cut is sharp enough to decide every case.

There is also a trap in the second option that is worth naming, because it quietly destroys the thing it is trying to buy.

---

## 1. The cut: does the data leave BV?

Our frozen export is exactly three things (`fetch_bv_export.py:17-19`):

```
GET /API/Election/{id}                    -> Election
GET /API/Election/{id}/anonymizedBallots  -> Ballots
GET /API/ElectionResult/{id}              -> Results
```

**No roll. No email events. No voter identities.** And not by oversight — `anonymizedBallots` is the deliberately-scrubbed endpoint, and the roll endpoint strips `ballot_id` and `voter_id` precisely so voters cannot be linked to ballots (`getElectionRollController.ts:141-156`).

That splits every report cleanly:

| | Data leaves BV | Report belongs |
|---|---|---|
| **A. Tabulation** — ballots → winner, matrix, Condorcet, runoff, score distribution, tie resolution | **yes**, fully | **our library** |
| **B. Electorate** — voter status, turnout, delivered/bounced, not-voted, quorum, eligible voters | **no, and must not** | **BetterVoting, necessarily** |

Category B is not "not exported yet." Building it in the library would require exactly the voter↔ballot linkage BV is engineered to prevent. **It must live in BV, and we should stop thinking of it as something we could take on.** That is the whole answer to "should we bypass BV" for the voter-status family: we cannot, and shouldn't want to.

Category A we already do better, and should keep. The LH engine's report (pairwise matrix, Condorcet, score counts, IRV divergence, runoff funnel, Smith set), the `_tabulated` mirrors, the generated pages, plus genuinely independent second opinions — `pref_voting`, `abcvoting`, RCTab, rcv-lab.org — are well past what BV renders and past what BV's volunteers could maintain.

---

## 2. The trap: a conclusion cannot cross-check a conclusion

*"Get BV to build reports we can cross-check against the library"* sounds right and is backwards for Category A.

**The cross-check has value only because the second opinion is independent.** LH, `pref_voting`, `abcvoting` and RCTab are systems nobody at BV wrote. When LH and BV agree on a Ranked Robin winner, that means something. When BV's report agrees with BV's other report, that means nothing at all — same ballots, same code, same bugs.

So every *conclusion* BV computes and publishes is one we can no longer independently verify; we can only confirm we received it. Asking BV to compute more of them **reduces** the audit surface while looking like it expands it.

What we actually want from BV is the opposite:

> **Ask for raw data and a stable schema. Do not ask for conclusions.**

Which reframes the upstream priorities:

- **[#1420](https://github.com/Equal-Vote/bettervoting/issues/1420)** — the JSON export leaking the tabulator's internal object shape — is **more important than any new report**. Schema drift silently breaks every downstream check we own. It is unglamorous and it is the load-bearing one.
- **[#1160](https://github.com/Equal-Vote/bettervoting/issues/1160)** (raw vs processed ballots), **#1085/#1039** (headers, meta columns), **#883** (multi-race CSV) are all *data* asks. They are the ones that pay us back.
- **#1071/#1154** (BV emits an LH-format text report) is the case to **decline politely**. It would have BV reimplement our engine's output, and the result could never audit us — it would be a second rendering of the same tally. If anyone wants an LH report of a BV election, the pipeline already exists: `fetch_bv_export.py` → `01_convert_json_yaml.py` → the engine. That is a *library* job, and it already works.

---

## 3. Where BV *should* render — and it isn't for us

None of the above says BV should render less. It says BV should render for **its own users**, who will never touch our library: someone running a club election needs turnout and bounce counts on screen, not a YAML file and a Python engine.

So the two are complements with different consumers:

| | BV renders | Library computes |
|---|---|---|
| Consumer | election admin, voter | auditor, researcher, us |
| Purpose | run the election | verify it independently |
| Fed by | its own DB | the exported raw data |

The discipline that keeps this honest: **both must be fed by the same exported raw data, so that when they disagree, the disagreement is visible.** That is exactly what [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407) (reconciling the pets election between LH and BV reports) is doing, and why that kind of issue is worth more than it looks.

---

## 4. The tie report, as the worked example

The tie-break case shows the principle resolving a real design question rather than just sorting it.

[`tiebreak-audit-report.md`](tiebreak-audit-report.md) found that BV's random tiebreak is fully reproducible — we replay it in Python — **but** that reproducing it requires the **raw** ballot count, while the results page shows the **tally** count, with no `nVotes` field anywhere. So there are two different asks hiding inside "better tie reporting":

1. **A rendered explanation** — *"3-way score tie → five-star count → random shuffle."* For the admin. This is #1432, already well specified, and correctly BV's job.
2. **The raw seed inputs** — `rawVoteCount`, `raceId`, the computed seed, `tieBreakOrder`, an algorithm version. For us. This is a **data** ask, and it is the one that lets an outsider prove the draw was honest.

(2) is currently missing from #1432 and is the higher-value half. Note it is *not* a request for a report: it is a request that the numbers behind the report be stated. That is the shape every Category A ask should take.

---

## 5. Decision

1. **Category A stays in the library.** Do not ask BV to build tabulation reports; every one it builds is one we can no longer independently check.
2. **Category B must be built in BV.** We cannot build it — the data is unexportable by design. There is no cross-check to be had, and none is needed: nothing else holds the roll.
3. **Ask BV for data and schema stability, not conclusions.** #1420 first.
4. **Decline the LH-format-report asks** (#1071/#1154) — politely, with the working pipeline as the alternative.
5. **Keep BV's own rendering for BV's own users.** Different consumer, not a duplicate.

---

## Related

- [`reporting-and-voter-status-map.md`](reporting-and-voter-status-map.md) — Category B: what's already collected, what's missing
- [`tiebreak-audit-report.md`](tiebreak-audit-report.md) — Category A worked example
- Upstream: [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) · [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407) · [#1432](https://github.com/Equal-Vote/bettervoting/issues/1432)
