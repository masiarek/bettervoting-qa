# STAR Race Details finalist probe

Reproduces [#1484](https://github.com/Equal-Vote/bettervoting/issues/1484) from a committed
payload, with no browser and no BetterVoting checkout.

`render_race_details.mjs` transcribes three things **verbatim** from `Equal-Vote/bettervoting`
`main` @ `454a38ae`:

| From | What |
|---|---|
| `packages/backend/src/Tabulators/Util.ts:330-334` | `runBlocTabulator`'s `compare` callback |
| `packages/backend/src/Tabulators/Star.ts:29-40` | `Star()`'s `evaluate` callback |
| `packages/frontend/src/components/Election/Results/STAR/STARDetailedResults.tsx:28-52` | the Scores Table / Runoff Table construction (the gold highlight is CSS — `.starScoreTable tr:nth-child(1),(2)`) |

`evaluate` reads nothing but `roundResults` and `score`, both of which the served payload
carries, so the backend's candidate sort can be replayed on a frozen export — with the
comparator as it is on `main` and as the fix has it, and the frontend selection expression
both ways, giving all four combinations.

```bash
node render_race_details.mjs
```

Recorded output: [`run.out`](run.out).

The load-bearing line is the first one: replaying `main`'s comparator on the frozen payload
reproduces the order production actually served — `Ana, Ben, Cora, Dev` — which is what rules
out the "deploy gap" the issue floats as an alternative. The comparator returns **`NaN`** for
any two candidates who both lost, `Array.prototype.sort` coerces that to `+0`, and the
`runnerUpRound` key that would have lifted Cora is never read.

`qhjyr2_bv_export.json` is BV2276, [`qhjyr2`](https://bettervoting.com/qhjyr2/results), fetched
2026-08-05 — copied from
[star-voting-library](https://github.com/masiarek/star-voting-library/blob/master/01_STAR/03_Criteria/tie_break_ladder/cases/bv2276_qhjyr2_second_finalist_tie_bv_export.json),
where the same election has a YAML and an independent count.

**What this does not prove:** that the rendered page looks the way the transcription says. The
tables were not opened in a browser for this work — the screenshots in the issue are the
evidence for that, and they agree with the `main` / `positional` block below.

See [`../../issues/1484-race-details-runner-up.md`](../../issues/1484-race-details-runner-up.md).
