// Runs BetterVoting's real STAR tabulator over four ballot sets and prints what the
// results page would show. See README.md for setup and for the expected output under
// each of the three rules. Path assumes the layout described there: probe/ beside bv/.
import { Star } from '../bv/packages/backend/src/Tabulators/Star';

const mk = (names: string[], votes: (number|null)[][]) => {
  const candidates = names.map((name) => ({
    name, id: name, tieBreakOrder: names.indexOf(name),
    votesPreferredOver: {}, winsAgainst: {},
  })) as any[];
  const raw = votes.map(v => ({ marks: Object.fromEntries(names.map((n,i) => [n, v[i]])) })) as any[];
  return [candidates, raw] as const;
};

const show = (label: string, names: string[], votes: (number|null)[][]) => {
  const [c, v] = mk(names, votes);
  const r: any = Star(c as any, v as any, 1);
  const s = r.summaryData;
  const winner = r.elected[0]?.name ?? '(none)';
  const scores = s.candidates.map((x:any) => `${x.name}=${x.score}`).join(' ');
  const fin = r.roundResults[0];
  const f0 = fin.winners[0], f1 = fin.runner_up[0];
  const p0 = f0 ? f0.votesPreferredOver[f1?.id] : 0;
  const p1 = f1 ? f1.votesPreferredOver[f0?.id] : 0;
  const eq = s.nTallyVotes - p0 - p1;
  console.log(`${label}\n  tally=${s.nTallyVotes} abst=${s.nAbstentions} oob=${s.nOutOfBoundsVotes}  scores: ${scores}`);
  console.log(`  winner=${winner} tieBreak=${r.tieBreakType}  runoff: ${f0?.name}=${p0} ${f1?.name}=${p1} EqualSupport=${eq}`);
  if (s.nTallyVotes > 0) {
    const den = p0 + p1 + eq;
    console.log(`  runoff %: ${f0?.name}=${(100*p0/den).toFixed(1)}% ${f1?.name}=${(100*p1/den).toFixed(1)}% Equal=${(100*eq/den).toFixed(1)}%  majorityMarker=${(p0+p1)/2}`);
    console.log(`  score %: ` + s.candidates.map((x:any)=>`${x.name}=${(100*x.score/(s.nTallyVotes*5)).toFixed(1)}%`).join(' '));
  }
  console.log('');
};

const AB = ['A','B'];
const ex1: (number|null)[][] = [[5,3],[5,3],[5,3],[3,5],[3,5],[5,5],[5,5],[5,5],[5,5]];
const ex2: (number|null)[][] = [[5,3],[5,3],[5,3],[3,5],[3,5],[0,0],[0,0],[0,0],[0,0]];
const ABC = ['Anchovy','Basil','Caper'];
const ex3: (number|null)[][] = [[1,1,1],[2,2,2],[3,3,3],[4,4,4],[5,5,5]];

console.log('=== flag = ' + (process.env.FLIP ? 'FIXED (all-equal counts)' : 'TODAY (all-equal abstains)') + ' ===\n');
show('EX1: 3x(5,3) 2x(3,5) 4x(5,5)', AB, ex1);
show('EX2: 3x(5,3) 2x(3,5) 4x(0,0)', AB, ex2);
show('EX3: all-flat 1..5 (library case 08)', ABC, ex3);
show('EX4: 3x(5,3) 2x(3,5) 2x(0,null) 2x(null,null)', AB, [[5,3],[5,3],[5,3],[3,5],[3,5],[0,null],[0,null],[null,null],[null,null]]);
