import { Star } from '../bv/packages/backend/src/Tabulators/Star';
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (n: number) => Math.floor(rnd() * n);
const winnerOf = (names: string[], ballots: Record<string, number>[]) => {
  const candidates = names.map((name, i) => ({ name, id: name, tieBreakOrder: i, votesPreferredOver: {}, winsAgainst: {} })) as any[];
  const raw = ballots.map(m => ({ marks: { ...m } })) as any[];
  try { return (Star(candidates as any, raw as any, 1) as any).elected[0]?.name ?? null; } catch { return 'ERR'; }
};
const N = Number(process.env.N ?? 20000);
const MINV = Number(process.env.MINV ?? 3), MAXV = Number(process.env.MAXV ?? 12);
const out: string[] = [];
let considered = 0;
for (let t = 0; t < N; t++) {
  const nOff = 2 + ri(2);
  const names = [...Array(nOff)].map((_, i) => String.fromCharCode(65 + i));
  names.push('W');
  const nv = MINV + ri(MAXV - MINV + 1);
  const ballots: Record<string, number>[] = [];
  for (let v = 0; v < nv; v++) {
    const b: Record<string, number> = {};
    if (rnd() < 0.4) { const s = 1 + ri(5); names.slice(0, nOff).forEach(n => b[n] = s); }
    else { names.slice(0, nOff).forEach(n => b[n] = ri(6)); if (rnd() < 0.5) b['W'] = ri(6); }
    ballots.push(b);
  }
  if (!ballots.some(b => 'W' in b)) continue;
  considered++;
  out.push(winnerOf(names, ballots) ?? 'null');
}
console.log(`considered=${considered}`);
require('fs').writeFileSync(process.env.OUT!, out.join('\n'));
