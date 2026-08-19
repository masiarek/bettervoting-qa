// Reproduces Equal-Vote/bettervoting#1484 from a committed payload, with no browser and no
// BetterVoting checkout.
//
// Three things are transcribed verbatim from upstream `main` @ 454a38ae:
//   1. runBlocTabulator()'s `compare` callback  -- packages/backend/src/Tabulators/Util.ts:330-334
//   2. Star()'s `evaluate` callback             -- packages/backend/src/Tabulators/Star.ts:29-40
//   3. STARDetailedResults's table construction -- packages/frontend/src/components/Election/
//                                                  Results/STAR/STARDetailedResults.tsx:28-52
//      (plus the gold highlight, which is CSS: `.starScoreTable tr:nth-child(1),(2)`)
//
// `evaluate` needs only roundResults + score, all of which the served payload carries, so the
// backend's candidate sort can be replayed on a frozen export.
//
//   node render_race_details.mjs
//
// Data: qhjyr2_bv_export.json -- BV2276, https://bettervoting.com/qhjyr2/results, fetched
// 2026-08-05. Copied from masiarek/star-voting-library
// (01_STAR/03_Criteria/tie_break_ladder/cases/bv2276_qhjyr2_second_finalist_tie_bv_export.json).

import { readFileSync } from 'node:fs';

const results = JSON.parse(
    readFileSync(new URL('qhjyr2_bv_export.json', import.meta.url), 'utf8')
).Results[0];

// ---- 1. Util.ts, runBlocTabulator ------------------------------------------------------------
const compareOnMain = (a, b, i) => {
    if (i > a.length || i > b.length) return 0;
    const diff = -(a[i] - b[i]);
    return diff == 0 ? compareOnMain(a, b, i + 1) : diff;
};

const compareFixed = (a, b, i) => {
    if (i >= a.length || i >= b.length) return 0;
    if (a[i] === b[i]) return compareFixed(a, b, i + 1);
    return a[i] < b[i] ? 1 : -1;
};

// ---- 2. Star.ts, evaluate ---------------------------------------------------------------------
const evaluate = (candidate, roundResults) => {
    const winRound = roundResults.findIndex(r => r.winners[0].id == candidate.id);
    const runnerUpRound = roundResults.findIndex(r => r.runner_up[0]?.id == candidate.id);
    return [
        winRound == -1 ? -Infinity : -winRound,
        runnerUpRound == -1 ? -Infinity : -runnerUpRound,
        candidate.score,
    ];
};

const sortSummary = (results, compare) =>
    results.summaryData.candidates
        .map(c => [c, evaluate(c, results.roundResults)])
        .sort(([, a], [, b]) => compare(a, b, 0))
        .map(([c]) => c);

// ---- 3. STARDetailedResults.tsx ---------------------------------------------------------------
const renderTables = (candidates, results, selection) => {
    const [winner, runnerUp] = selection == 'positional'
        ? candidates
        : [results.roundResults[0].winners[0], results.roundResults[0].runner_up[0]]
            .map(c => candidates.find(sc => sc.id == c.id) ?? c);

    const finalistOpponent = {
        [winner.id]: runnerUp.id,
        [runnerUp.id]: winner.id,
    };

    const runoffData = [winner, runnerUp].map(c => ({
        name: c.name,
        runoffVotes: c.votesPreferredOver[finalistOpponent[c.id]],
    }));
    const finalistVotes = runoffData[0].runoffVotes + runoffData[1].runoffVotes;
    runoffData.push({
        name: 'Equal Support',
        runoffVotes: results.summaryData.nTallyVotes - finalistVotes,
    });

    return {
        // .starScoreTable tr:nth-child(1) and (2) get --brand-gold
        goldRows: candidates.slice(0, 2).map(c => `${c.name} ${c.score}`),
        runoffData,
    };
};

// ---- report -----------------------------------------------------------------------------------
const chart = [
    results.roundResults[0].winners[0].name,
    results.roundResults[0].runner_up[0].name,
];

console.log(`election      : qhjyr2 (BV2276), ${results.votingMethod}, 1 winner`);
console.log(`tieBreakType  : ${results.tieBreakType}`);
console.log(`served order  : ${results.summaryData.candidates.map(c => `${c.name} ${c.score}`).join(', ')}`);
console.log(`roundResults  : winner ${chart[0]}, runner_up ${chart[1]}`);
console.log(`\nthe charts read roundResults, so they show ${chart[0]} vs ${chart[1]}.`);

for (const [label, compare] of [['main', compareOnMain], ['fixed', compareFixed]]) {
    const candidates = sortSummary(results, compare);
    console.log(`\n=== backend sort: ${label} ===`);
    console.log(`  summaryData.candidates : ${candidates.map(c => c.name).join(', ')}`);
    for (const selection of ['positional', 'roundResults']) {
        const { goldRows, runoffData } = renderTables(candidates, results, selection);
        console.log(`  frontend selection: ${selection}`);
        console.log(`    Scores Table (gold) : ${goldRows.join(' + ')}`);
        console.log(`    Runoff Table        : ${runoffData.map(r => `${r.name} ${r.runoffVotes}`).join(' | ')}`);
    }
}

// and the NaN that causes it
const [a, b] = [[-Infinity, -Infinity, 14], [-Infinity, 0, 14]];
console.log(`\ncompare on main, two non-winners: ${compareOnMain(a, b, 0)}`);
console.log(`Array.prototype.sort coerces that to +0, i.e. "equal" -- the runnerUpRound key is never read.`);
