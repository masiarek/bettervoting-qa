// #1035 — before/after evidence for the runoff zero-denominator fix.
//
// Run from inside a bettervoting checkout (copy this file to the repo root):
//     npx tsx nan-fix-verify.ts
//
// What it does, and how much of it is "real":
//
//  * The tally is REAL — it calls the backend's own `Star()` on each ballot set.
//  * `formatPercent` is REAL — its source is extracted out of
//    packages/frontend/src/components/util.tsx at run time and evaluated, so
//    what runs is the shipped function, not a copy of it. (util.tsx cannot be
//    imported directly here: it pulls in MUI, react-i18next and the `~/` alias.)
//  * The two remaining expressions live inside JSX and are TRANSCRIBED verbatim,
//    one line each, from the files and line numbers named below.
//
// The "before" column re-implements the pre-fix formatPercent (no guard) so the
// same input can be shown both ways in one run.

import * as fs from 'fs';
import * as path from 'path';
import { Star } from './packages/backend/src/Tabulators/Star';

const REPO = path.resolve(__dirname);

// ---------------------------------------------------------------- real source
// Pull the shipped formatPercent out of util.tsx and evaluate it.
const utilSrc = fs.readFileSync(
    path.join(REPO, 'packages/frontend/src/components/util.tsx'), 'utf8');
const fpMatch = utilSrc.match(/export const formatPercent = [\s\S]*?\n}/);
if (!fpMatch) throw new Error('could not find formatPercent in util.tsx');
const phMatch = utilSrc.match(/export const NO_DATA_PLACEHOLDER = '(.*)';/);
const NO_DATA_PLACEHOLDER = phMatch ? phMatch[1] : undefined;
const fpBody = fpMatch[0]
    .replace('export const formatPercent = ', '')
    .replace('(f: number): string =>', '(f) =>')              // erase the TS types for eval
    .replace('NO_DATA_PLACEHOLDER', JSON.stringify(NO_DATA_PLACEHOLDER));
// eslint-disable-next-line no-eval
const formatPercent: (f: number) => string = eval(`(${fpBody})`);
console.log('formatPercent under test, read from util.tsx:\n' + fpBody + '\n');

// The pre-fix version, for the "before" column.
const formatPercentBefore = (f: number): string => {
    if (0 < f && f < .01) return '<1%';
    return `${Math.round(100 * f)}%`;
};

const run = (label: string, names: string[], ballots: Record<string, number | null>[]) => {
    const candidates = names.map((name, i) => (
        { name, id: name, tieBreakOrder: i, votesPreferredOver: {}, winsAgainst: {} })) as any[];
    const raw = ballots.map(m => ({ marks: { ...m } })) as any[];
    const r: any = Star(candidates as any, raw as any, 1);
    const s = r.summaryData;

    const winner = r.roundResults[0].winners[0];
    const runnerUp = r.roundResults[0].runner_up[0];

    // STARDetailedResults.tsx:42-47 — the runoff pair and its denominator.
    const runoffData = [winner, runnerUp].map((c, i) => ({
        name: c.name,
        runoffVotes: c.votesPreferredOver[[winner, runnerUp][1 - i].id],
    }));
    const finalistVotes = runoffData[0].runoffVotes + runoffData[1].runoffVotes;
    // STARDetailedResults.tsx (post-fix): the guard for the total row.
    const noPreferenceExpressed = finalistVotes === 0;

    // STARResultSummaryWidget.tsx:48-51 — the pie's data is the finalist pair only.
    const pieTotal = runoffData.reduce((sum, d) => sum + d.runoffVotes, 0);
    // ResultsPieChart.tsx (post-fix): the empty-chart guard.
    const isEmpty = pieTotal <= 0;

    console.log(`\n=== ${label}`);
    console.log(`    nTallyVotes = ${s.nTallyVotes}   (Results.tsx renders the STAR viewer when this is >= 1)`);
    console.log(`    finalists ${winner.name} / ${runnerUp.name}: preferredOver = ` +
                `${runoffData[0].runoffVotes}, ${runoffData[1].runoffVotes}  ->  finalistVotes = ${finalistVotes}`);

    console.log('    Runoff Table, "% Between Finalists" column');
    runoffData.forEach(d => {
        const q = d.runoffVotes / finalistVotes;
        console.log(`      ${d.name.padEnd(10)} ${String(d.runoffVotes).padStart(3)}/${finalistVotes}` +
                    `   before: ${formatPercentBefore(q).padEnd(6)}  after: ${formatPercent(q)}`);
    });
    console.log(`      ${'TOTAL'.padEnd(10)}     ` +
                `   before: ${'100%'.padEnd(6)}  after: ${noPreferenceExpressed ? NO_DATA_PLACEHOLDER : '100%'}`);

    console.log('    Runoff Table, "% Runoff Votes" column (denominator = nTallyVotes, never zero here)');
    runoffData.forEach(d => {
        const q = d.runoffVotes / s.nTallyVotes;
        console.log(`      ${d.name.padEnd(10)} ${String(d.runoffVotes).padStart(3)}/${s.nTallyVotes}` +
                    `   before: ${formatPercentBefore(q).padEnd(6)}  after: ${formatPercent(q)}`);
    });

    console.log(`    Runoff pie chart: total = ${pieTotal}  ->  ` +
                `before: ${isEmpty ? 'recharts draws no sectors -> blank circle, no label, no explanation'
                                   : 'chart renders'}` +
                `   after: ${isEmpty ? 'explanatory message replaces the chart' : 'chart renders (unchanged)'}`);

    console.log(`    WINNER = ${r.elected.map((c: any) => c.name).join(', ')}   ` +
                `scores = ${s.candidates.map((c: any) => `${c.name}:${c.score}`).join(' ')}`);
};

// The two degenerate sets from the #1035 root-cause comment.
run('A) DEGENERATE — three ballots {A:5,B:5,C:0}', ['A', 'B', 'C'],
    [{ A: 5, B: 5, C: 0 }, { A: 5, B: 5, C: 0 }, { A: 5, B: 5, C: 0 }]);
run('B) DEGENERATE — mixed scores, preferences still cancel', ['A', 'B', 'C'],
    [{ A: 5, B: 5, C: 1 }, { A: 4, B: 4, C: 0 }, { A: 3, B: 3, C: 2 }]);
// Controls: nothing about these may change.
run('C) CONTROL — ordinary runoff', ['A', 'B', 'C'],
    [{ A: 5, B: 3, C: 0 }, { A: 5, B: 2, C: 1 }, { A: 1, B: 5, C: 0 },
     { A: 0, B: 5, C: 2 }, { A: 4, B: 4, C: 5 }]);
run('D) CONTROL — lopsided runoff, exercises the <1% branch', ['A', 'B', 'C'],
    [...Array(200).fill({ A: 5, B: 0, C: 1 }), { A: 0, B: 5, C: 1 }]);
