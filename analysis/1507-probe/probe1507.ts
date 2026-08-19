// Probe for Equal-Vote/bettervoting#1507 -- prints the values the fix is about.
//
// It has to run inside a BetterVoting checkout, because it imports the tabulator
// itself. Copy it to packages/backend/probe1507.ts and run:
//
//     cd packages/backend && npx ts-node probe1507.ts
//
// run-before.out was recorded at upstream main 454a38ae; run-after.out with the
// fix (branch fix/1507-star-pr-tiebreaktype, commit 9a2b8b2a) applied.
import { AllocatedScore } from './src/Tabulators/AllocatedScore';
import { candidate, rawVote } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import * as fs from 'fs';

const mk = (names: string[], votes: (number|null)[][]): [candidate[], rawVote[]] => ([
  names.map((name, i) => ({ name, id: name, tieBreakOrder: i, votesPreferredOver: {}, winsAgainst: {} } as candidate)),
  votes.map(v => ({ marks: Object.fromEntries(names.map((n, i) => [n, v[i]])) } as rawVote)),
]);

const show = (label: string, r: any) => {
  console.log(`\n=== ${label} ===`);
  console.log('elected      :', r.elected.map((c: any) => c.name).join(', '));
  console.log('tieBreakType :', r.tieBreakType);
  console.log('tied         :', r.tied.length === 0 ? '(empty)' : r.tied.map((c: any) => c.name).join(', '));
  r.summaryData.weightedScoresByRound.forEach((round: number[], i: number) => {
    const max = Math.max(...round);
    console.log(`  round ${i + 1}: max ${max} held by ${round.filter(s => s === max).length} candidate(s)`);
  });
};

// 1. The profile from the issue text (also the production /API/Sandbox repro).
show('issue #1507 profile -- Ada/Ben/Cara, 2 seats',
  AllocatedScore(...mk(['Ada', 'Ben', 'Cara'], [[5,4,0],[5,3,1],[4,5,0],[0,2,5],[1,0,4]]), 2));

// 2. The real production election bvhchj (BV2130), replayed from its frozen export:
//    51 candidates, 7 seats, 102 ballots.
const EXPORT = '/Volumes/T7/Voting/Larry Hastings/YAML/03_STAR_PR/02_Examples/cases/bv2130_presidential_board_star_pr_bv_export.json';
if (fs.existsSync(EXPORT)) {
  const d = JSON.parse(fs.readFileSync(EXPORT, 'utf8'));
  const race = d.Election.races.find((r: any) => r.voting_method === 'STAR_PR');
  const names: string[] = race.candidates.map((c: any) => c.candidate_name);
  const ids: string[] = race.candidates.map((c: any) => c.candidate_id);
  const raceIndex = d.Election.races.indexOf(race);
  const votes = d.Ballots.map((b: any) => {
    const scores = b.votes[raceIndex].scores;
    const byId = Object.fromEntries(scores.map((s: any) => [s.candidate_id, s.score]));
    return ids.map(id => byId[id] ?? null);
  });
  const r = AllocatedScore(...mk(names, votes), race.num_winners);
  show(`production bvhchj (BV2130) -- ${names.length} candidates, ${race.num_winners} seats, ${votes.length} ballots`, r);
  const published = d.Results[raceIndex].elected.map((c: any) => c.name).join(' | ');
  const replayed = r.elected.map((c: any) => c.name).join(' | ');
  console.log('replay matches published elected order :', published === replayed);
  console.log('published tieBreakType (frozen export) :', d.Results[raceIndex].tieBreakType);
} else {
  console.log('\n(frozen export not found; skipped production replay)');
}
