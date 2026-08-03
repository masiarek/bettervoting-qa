import { Star } from '../bv/packages/backend/src/Tabulators/Star';
const run = (label: string, names: string[], ballots: Record<string, number|null>[]) => {
  const candidates = names.map((name,i)=>({name,id:name,tieBreakOrder:i,votesPreferredOver:{},winsAgainst:{}})) as any[];
  const raw = ballots.map(m=>({marks:{...m}})) as any[];
  const r:any = Star(candidates as any, raw as any, 1);
  const s = r.summaryData;
  const f0 = r.roundResults[0].winners[0], f1 = r.roundResults[0].runner_up[0];
  const p0 = f0.votesPreferredOver[f1.id], p1 = f1.votesPreferredOver[f0.id];
  const finalistVotes = p0 + p1;
  console.log(`${label}`);
  console.log(`  nTallyVotes=${s.nTallyVotes}  (Results.tsx:485 short-circuits only when this is 0 -> ${s.nTallyVotes===0?'HIDDEN':'WIDGET RENDERS'})`);
  console.log(`  finalists ${f0.name}/${f1.name}: preferredOver = ${p0}, ${p1}  -> finalistVotes = ${finalistVotes}`);
  console.log(`  STARDetailedResults.tsx:69  runoffVotes/finalistVotes = ${p0}/${finalistVotes} = ${p0/finalistVotes}`);
  console.log(`  pie percent (recharts) = value/total = ${p0}/${finalistVotes} = ${p0/finalistVotes}  -> label "${((p0/finalistVotes)*100).toFixed(0)}%"\n`);
};
run('A) three ballots {A:5,B:5,C:0}  — NOT an abstention under today\'s rule', ['A','B','C'],
    [{A:5,B:5,C:0},{A:5,B:5,C:0},{A:5,B:5,C:0}]);
run('B) mixed, still a zero-zero runoff', ['A','B','C'],
    [{A:5,B:5,C:1},{A:4,B:4,C:0},{A:3,B:3,C:2}]);
