import { Star } from '../bv/packages/backend/src/Tabulators/Star';

// A, B official; C = approved write-in. Ordinary browser ballots carry NO key for C.
const names = ['A','B','C'];
const ballots: Record<string, number>[] = [
  {A:4, B:4}, {A:4, B:4}, {A:4, B:4}, {A:4, B:4},   // sparse: no C key
  {A:4, B:2, C:3}, {A:0, B:3, C:5}, {A:1, B:2, C:0},
];

const run = () => {
  const candidates = names.map((name, i) => ({
    name, id: name, tieBreakOrder: i, votesPreferredOver: {}, winsAgainst: {},
  })) as any[];
  const raw = ballots.map(m => ({ marks: {...m} })) as any[];
  const r: any = Star(candidates as any, raw as any, 1);
  const s = r.summaryData;
  const f0 = r.roundResults[0].winners[0], f1 = r.roundResults[0].runner_up[0];
  console.log(`  tally=${s.nTallyVotes} abstentions=${s.nAbstentions}`);
  console.log(`  scores: ` + s.candidates.map((c:any)=>`${c.name}=${c.score}`).join(' '));
  console.log(`  finalists: ${f0?.name}, ${f1?.name}   ==> WINNER: ${r.elected[0]?.name}  (tieBreak=${r.tieBreakType})`);
};
console.log(process.env.MODE === 'A' ? '--- EDIT (a): makeAbstentionTest() ---' : '--- TODAY: makeAbstentionTest(true) ---');
run();
