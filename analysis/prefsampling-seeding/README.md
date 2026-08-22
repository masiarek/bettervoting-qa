# prefsampling's seeded Euclidean samplers — two defects, in full

**Filed as [COMSOC-Community/prefsampling#6](https://github.com/COMSOC-Community/prefsampling/issues/6)** (the defects) and **[voting-tools/pref_voting#186](https://github.com/voting-tools/pref_voting/issues/186)** (the downstream half). Both open as of 2026-08-22. Version under test: `prefsampling` 0.1.24, `pref_voting` 1.18.1, `numpy` 2.2.6.

**Why this page is in a BetterVoting QA repo.** It isn't BetterVoting code. It is here because it is the same *genre* as this repo's other pages — a defect in third-party software, traced to its line, reproduced by a probe, and written up so an upstream maintainer can act on it — and because the teaching library on the other side of the cross-reference wanted the short version, not this one. The reader-facing lesson lives there: **[The six Euclidean spaces](https://masiarek.github.io/star-voting-library/07_Concepts/topics/euclidean_spaces.html)** explains what `uniform_ball`, `gaussian_cube` and the rest actually are, with pictures, and hands off to this page for the mechanism. This page assumes you already know that and want the arithmetic.

Everything asserted below is printed by [`probe.py`](probe.py); the recorded run is [`probe.out`](probe.out).

---

## 0. The one-sentence version

**A seed is not a random number generator.** A seed is an integer, and integers are free to copy; a generator is a *stateful object* that advances as you draw from it. Every defect on this page is the same mistake wearing two costumes: the same seed handed to two places that each build their own generator from it, producing two identical streams where two independent ones were intended.

```python
>>> np.array_equal(np.random.default_rng(42).random(3),
...                np.random.default_rng(42).random(3))
True
```

That line is not a bug — it is the entire *purpose* of seeding. It becomes a bug the moment two different things in one program each do it with the same integer.

## 1. Background: what seeding actually does

A pseudo-random generator is a deterministic state machine. numpy's modern interface splits it in three:

| Layer | Object | Job |
|---|---|---|
| entropy | `SeedSequence` | turn a user's integer into a high-quality initial state, and **spawn independent children** |
| stream | `BitGenerator` (PCG64 by default) | advance the state, emit uniform bits |
| distributions | `Generator` | turn bits into normals, uniforms, gammas… |

`np.random.default_rng(seed)` builds all three. Two calls with the same `seed` build two machines in the same state — indistinguishable, forever. That is reproducibility, and it is why `seed=` exists.

The correct way to get *several* independent reproducible streams from one seed is not to add 1 to it. It is to **spawn**:

```python
ss = np.random.SeedSequence(42)
voters_rng, cands_rng = (np.random.default_rng(s) for s in ss.spawn(2))
```

`SeedSequence.spawn` runs the seed through a hashing construction that gives statistically independent children, with a documented guarantee. Seed arithmetic (`seed`, `seed+1`, `seed+2`) has no such guarantee — neighbouring seeds are only *usually* unrelated, which is precisely the kind of "usually" a Monte Carlo study should not be built on. prefsampling uses seed arithmetic in one place and seed *copying* in another; the copying is what actually breaks.

**The API-shape rule this implies:** a function that samples should accept a **`Generator`**, not an `int`. Accepting an int forces the callee to construct a generator, which means the caller has lost the ability to sequence draws — and two callees given the same int will silently collide. Every defect below follows from `prefsampling`'s samplers taking `seed: int = None`.

---

## 2. Defect 1 — `GAUSSIAN_BALL` returns one point, `num_points` times

### The composition

`euclidean_space_to_sampler` builds the sampler and its arguments ([`core/euclidean.py`](https://github.com/COMSOC-Community/prefsampling/blob/main/prefsampling/core/euclidean.py)):

```python
if space == EuclideanSpace.GAUSSIAN_BALL:
    return ball_resampling, {
        "num_dimensions": num_dimensions,
        "inner_sampler": lambda **kwargs: gaussian(**kwargs)[0],
        "inner_sampler_args": {
            ...,
            "sigmas": [0.33] * num_dimensions,
            "seed": seed,            # <-- pinned here
        },
        "seed": seed,
    }
```

`ball_resampling` then draws every point out of that one dict ([`point/ball.py`](https://github.com/COMSOC-Community/prefsampling/blob/main/prefsampling/point/ball.py)):

```python
for _ in range(num_points):
    point = inner_sampler(**inner_sampler_args)      # same dict, every iteration
    while np.linalg.norm(point - center_point) > (width / 2):
        if seed is not None:
            seed += 1
            inner_sampler_args["seed"] = seed        # mutates the SHARED dict
        point = inner_sampler(**inner_sampler_args)
```

And `gaussian` does `rng = np.random.default_rng(seed)` on entry. So the inner sampler has no memory: given the same integer, it returns the same point.

### Why the output is identical with probability 1

Trace the outer loop. Write `p(s)` for the point `gaussian` returns at seed `s`, and let `k ≥ 0` be the smallest offset with `‖p(s+k)‖ ≤ R`.

- **Iteration 1** draws `p(s)`. If `k = 0` it is accepted immediately and the dict still holds `s`. If `k > 0` the while-loop advances the dict to `s+1, …, s+k`, accepting `p(s+k)`. Either way, iteration 1 appends `p(s+k)` and leaves `inner_sampler_args["seed"] == s+k`.
- **Iteration 2** draws `p(s+k)` — which is inside the ball by construction, so the while-loop does not execute, and it appends `p(s+k)` again.
- **Iterations 3…n** are iteration 2.

So all `n` points equal `p(s+k)`. Not "usually", not "for most seeds" — **always**, for every seed and every `num_points`. (The one escape hatch in the code is the `max_numer_resampling = 1000` guard, which substitutes the ball's *centre* after a thousand consecutive rejections. Tripping it needs `p(s)…p(s+999)` all outside — with a per-draw rejection probability of 0.317 that is an event of order 10⁻⁵⁰⁰, so no seed anyone tries will ever reach it; and forcing the cap with a deliberately tiny ball still returns one distinct point, the centre, repeated. The trace survives its own edge case.) Measured:

```text
  seed  points  distinct  first point
     0       8         1  [+0.041491 -0.043595]
     1       8         1  [+0.114043 +0.271134]
     7       8         1  [+0.000406 +0.098586]
    42       8         1  [+0.100557 -0.343195]
  2026       8         1  [-0.261730 +0.079389]

distinct points, seed=None: 8 of 8
```

The unseeded row is the tell: `seed=None` makes `default_rng()` draw fresh OS entropy on every call, so the inner sampler *does* move. **Seeding is what breaks it** — the recommended practice is the failure trigger.

### The package documents the intent it violates

`ball_resampling`'s own docstring: *"We increase the seed by one each time we resample (to avoid always resampling the same point)."* The author saw the hazard and guarded the inner `while`. The outer `for` — written in the same function — defeats the guard, because the mutation persists past the iteration that made it.

### A retracted explanation, kept because the correction is the interesting part

The first draft of this analysis said the rejection branch "effectively never runs" (σ = 0.33 against R = 0.5, so draws are almost always accepted first try). **That is false.** In 2-D, `‖X‖` for `X ~ N(0, σ²I₂)` is [Rayleigh](https://en.wikipedia.org/wiki/Rayleigh_distribution) distributed, so

$$P(\lVert X\rVert > R) = \exp\!\left(-\frac{R^2}{2\sigma^2}\right) = \exp\!\left(-\frac{0.25}{2(0.33)^2}\right) = 0.3173$$

— the branch fires for about **a third** of seeds. Measured: **625/2000 = 31.2%** against the analytic **31.7%**.

The retraction does not weaken the finding; it strengthens it. The correct mechanism is the *persistence* of the advanced seed, not the rarity of the advance — which turns "usually identical" into "identical with probability 1". A bug report built on the wrong reason is refutable in one line by a maintainer who checks that reason, so this correction went upstream before the issue was cited anywhere.

---

## 3. Defect 2 — candidate *j* lands exactly on voter *j*

### The composition

`sample_election_positions` calls `_sample_points` twice with the same `seed`, and `_sample_points` ends with:

```python
new_positions_args.update(positions_args)   # merge the caller's args...
positions_args = new_positions_args
positions_args["seed"] = seed               # ...then overwrite the seed anyway
positions_args["num_points"] = num_points
```

Two consequences. Both position sets are drawn from a generator built from the *same* integer — and the clobber means **a caller cannot work around it**: pass `voters_positions_args={"seed": 1}` and it is discarded on the next line. Within the named-space API there is no user-side fix; the only escape is to stop using it — pass your own sampler `Callable` (ignoring the seed it injects) or precomputed positions. `pref_voting`'s euclidean path exposes neither, so for it a patch is the only fix.

### Whether that produces a collision depends on array shape — which is an accident

Given identical streams, candidate *j* coincides with voter *j* iff the sampler maps stream position to `(point, coordinate)` in a way that does not depend on `num_points`. It comes down to one `size=` argument:

| Sampler | draws | fill order | point *j* depends on *n*? |
|---|---|---|---|
| `cube` | `rng.random((n, d))` | C-order, **row per point** — point *j* owns slots `[jd, jd+d)` | **no** → collides |
| `gaussian` | `rng.normal(size=(n, d))` | same | **no** → collides |
| `gaussian` + `widths` | `rng.normal(size=d)` per point, in a rejection loop | sequential per point; identical seeds walk identical accept/reject paths | **no** → collides |
| `ball_uniform` | `rng.normal(size=(d, n))` then `rng.random(n)` | C-order over a **transposed** array — the first *n* draws are the *x*-coordinate of *every* point | **yes** → escapes, unless `n` matches |

Isolated directly — same seed, 5 points vs 3 points, asking whether point *j* is the same point in both runs:

```text
  cube (point-major)         point j identical in both runs: 3/3
  gaussian (point-major)     point j identical in both runs: 3/3
  gaussian + widths (loop)   point j identical in both runs: 3/3
  ball_uniform (dim-major)   point j identical in both runs: 0/3
```

So the "escape" is not protection. It is a stride mismatch — and it is not independence either: the two position sets still come out of one stream. At 5 voters × 3 candidates on `uniform_ball`, voter *j* and candidate *j* share the very draw that becomes their *x* numerator (slot *j* of the first row in each run), and it shows — corr(voter₀.x, cand₀.x) = **+0.81** across 2,000 seeds while the y-correlation is ≈ 0, and the mean same-seed distance |voter₀ − cand₀| is 0.33 against 0.45 for genuinely independent draws. "Escapes" means *not bit-identical*; the voter and candidate clouds remain deterministically entangled.

The stride mismatch also evaporates the moment `num_voters == num_candidates`:

```text
  5 voters x 3 candidates                    4 voters x 4 candidates
    uniform_ball            0/200 clean        uniform_ball          200/200 COLLIDES
    uniform_sphere          0/200 clean        uniform_sphere        200/200 COLLIDES
    uniform_cube          200/200 COLLIDES     uniform_cube          200/200 COLLIDES
    gaussian_ball         200/200 COLLIDES     gaussian_ball         200/200 COLLIDES
    gaussian_cube         200/200 COLLIDES     gaussian_cube         200/200 COLLIDES
    unbounded_gaussian    200/200 COLLIDES     unbounded_gaussian    200/200 COLLIDES
```

At equal counts no stride analysis is even needed: with both sides drawn from the same named space — which is the only way `pref_voting`'s euclidean path ever calls this — the two `_sample_points` calls are the same function invoked with the same arguments, so the candidate array *is* the voter array, element for element, in any dimension. (Verified through d = 1, 2, 3 at 3×3, 6×6 and 10×10; different spaces on the two sides do not collide, but nothing downstream passes different spaces.)

### A second retracted explanation

The first draft said `uniform_ball` and `uniform_sphere` escape "because their rejection sampling desynchronises the two streams." **`ball_uniform` has no rejection sampling at all** — it is the direct polar method (normalise a Gaussian vector for the direction, then `R·U^(1/d)` for the radius). The draft was also internally inconsistent with its own table, since `gaussian_cube` *does* resample and collided anyway. The real cause is the transposed `size=` above, and the practical upshot is worse than the retracted version: "4 of 6 spaces" was an artifact of testing at unequal counts, not a property of the spaces.

---

## 4. Downstream: `pref_voting.generate_profile`

`generate_profile(probmodel="euclidean", …)` routes straight to prefsampling, so it inherits both defects. Distinct profiles returned over 300 consecutive seeds, 5 voters × 3 candidates, 2-D:

| space | distinct profiles / 300 |
|---|---|
| `uniform_ball` | 277 |
| `uniform_sphere` | 265 |
| `uniform_cube` | 127 |
| **`gaussian_ball`** | **1** |
| `gaussian_cube` | 126 |
| `unbounded_gaussian` | 114 |

`gaussian_ball` returns **one profile for every seed**. The full collapse needs both defects at once: defect 1 puts every voter on a single point, and defect 2 puts the candidates on that *same* point. Every distance is then zero, every ballot is a total tie, and the ranking that comes back is index order.

The reduced counts in the other rows (127, 126, 114 out of 300) are defect 2 alone — the candidate/voter duplication shrinks the space of reachable profiles without collapsing it.

Even the two "escape" rows are quietly below par. Rerunning the same 300 draws **unseeded** lands in the high 280s — across this review's nine repetitions, 286–291 for `uniform_ball` and 280–288 for `uniform_sphere` (the probe records three of them per space, re-rolled on every run) — against the seeded 277 and 265. Every unseeded repetition beat its seeded counterpart. The gap is consistent with §3's entanglement: same-stream voters and candidates concentrate the profile distribution even where no point coincides. Seeding this path degrades **all six** spaces; it merely ruins some more visibly than others.

`generate_spatial_profile` uses the legacy global `np.random` and is **unaffected**. The default `space="uniform_ball"` is clean at unequal counts, which is why the upstream report was scoped to "space X at counts Y" rather than "pref_voting is broken" — the latter is refutable in one line by a maintainer testing the default path.

---

## 5. How it was found

Not by reading the code. A sweep of 20,000 seeded spatial elections — measuring how often each Condorcet method returns a tied winner set — reported **0.00% cycles in every cell**. The tell was not a wrong number but an impossibly tidy one: a rate that is genuinely low should still wobble between cells. Correct rates on a working sampler are 0.15–1.25%.

The general lesson, and the reason this page exists in a QA repo: **a suspiciously clean result deserves the same scrutiny as a suspiciously bad one.** A collapsed sampler does not raise, does not warn, and returns a perfectly well-formed profile. Nothing but the implausibility of the answer points at it.

## 6. What a fix looks like

Minimally, and without changing the public signature:

1. **`ball_resampling`** — build one `Generator` from `seed` at entry and pass *it* to the inner sampler, instead of passing an int the inner sampler re-seeds from. Failing that, advance `inner_sampler_args["seed"]` on every outer iteration, not only on rejection.
2. **`sample_election_positions`** — derive two independent child seeds, `SeedSequence(seed).spawn(2)`, one per side.
3. **`_sample_points`** — do not clobber a caller-supplied `seed` after merging user args; that removes the only available workaround.

The structural fix is (1) generalised: **thread a `Generator` through, do not pass integers around.** That is what numpy's modern API is shaped for, and prefsampling already imports it — it just rebuilds one from an int at every leaf.

Worth noting how the same rule reads in a language with borrow semantics — pinned to `rand` 0.10 / `rand_distr` 0.6, since that API keeps renaming things. A sampler there is `Distribution::sample<R: Rng + ?Sized>(&self, rng: &mut R)`: it takes a *mutable borrow* of the generator, so two samplers cannot hold the stream at once and every draw visibly advances the caller's `rng`. Forking a stream is an explicit call, `SeedableRng::from_rng(&mut parent)` — though that is only the *mechanism* analogue of `SeedSequence.spawn`, not the guarantee: rand's own docs warn that seeding a PRNG from a same-algorithm parent can correlate the streams (the extreme case clones the parent outright) and recommend a different-algorithm master, where numpy's `spawn` documents independence. And none of this is compiler magic against *this* bug — a `u64` seed is `Copy`, so `f(seed); g(seed);` compiles in Rust exactly as it runs in Python. The protection is the idiom of passing the generator, which the borrow checker then enforces: same rule, machine-checked instead of reviewed. (One more from-memory claim corrected against the docs while pinning versions: `rand_distr` ships its unit shapes at fixed dimension only — `UnitDisc`/`UnitCircle` in 2-D, `UnitBall`/`UnitSphere` in 3-D — so a general-dimension uniform ball in Rust is still the polar two-step from the table above: Gaussian direction, radius `R·U^(1/d)`.)

## 7. Reproducing

```bash
python probe.py              # all five sections
python probe.py --section 3  # just the voter/candidate collision
```

Needs `prefsampling`, `pref_voting`, `numpy`. This repo's `.venv` has none of them; [`probe.out`](probe.out) was recorded with the star-voting-library venv, which pins all three.

## Related

- **[The six Euclidean spaces](https://masiarek.github.io/star-voting-library/07_Concepts/topics/euclidean_spaces.html)** — the reader-facing half of this page: what the six spaces are, with pictures and a measured comparison
- [How often do Condorcet methods tie?](https://masiarek.github.io/star-voting-library/07_Concepts/topics/ties/how_often_condorcet_methods_tie.html) — the sweep whose impossible 0.00% started this
- [upstream bug reports](https://masiarek.github.io/star-voting-library/07_Concepts/about_this_repo/upstream_bug_reports.html) — the standing follow-up table both issues are tracked in
- [`tiebreak-audit-report.md`](../tiebreak-audit-report.md) — this repo's other "read the source, then measure it" audit
