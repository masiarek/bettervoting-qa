#!/usr/bin/env python3
"""
probe.py — measure, rather than assert, the two seeding defects in prefsampling 0.1.24.

Filed upstream as COMSOC-Community/prefsampling#6 (the defects) and
voting-tools/pref_voting#186 (the downstream half). Everything the writeup in
README.md claims is printed by this file, so a maintainer can re-derive it.

Why a probe and not a bug report with a code excerpt: the first version of this
analysis was written by *reading* the source, and an adversarial re-check refuted
two of its explanations while confirming both defects. Reading tells you what a
function does; only running it tells you what the composition does.

Run:
    python probe.py                # every section
    python probe.py --section 3    # one section

Requires prefsampling (0.1.24 when this was recorded), pref_voting and numpy.
This repo's own .venv has none of them; recorded with the star-voting-library
venv, whose lockfile pins them:

    "/Volumes/T7/Voting/Larry Hastings/YAML/.venv/bin/python" probe.py > probe.out
"""

from __future__ import annotations

import argparse
import math

import numpy as np

import prefsampling
from prefsampling.core.euclidean import (
    EuclideanSpace,
    euclidean_space_to_sampler,
    sample_election_positions,
)
from prefsampling.point import ball_uniform, cube, gaussian

SPACES = [s.value for s in EuclideanSpace]


def rule(title: str) -> None:
    print()
    print("=" * 78)
    print(title)
    print("=" * 78)


# ---------------------------------------------------------------------------
# 1. Defect 1 — GAUSSIAN_BALL returns one point, repeated.
# ---------------------------------------------------------------------------
def section_1() -> None:
    rule("1. GAUSSIAN_BALL, seeded: how many DISTINCT points come back?")
    print(
        "euclidean_space_to_sampler pins the seed inside inner_sampler_args, and\n"
        "ball_resampling's outer loop draws every point from that same dict.\n"
    )
    print(f"{'seed':>6}  {'points':>6}  {'distinct':>8}  first point")
    for seed in (0, 1, 7, 42, 2026):
        sampler, args = euclidean_space_to_sampler(
            EuclideanSpace.GAUSSIAN_BALL, num_dimensions=2, seed=seed
        )
        args["num_points"] = 8
        pts = np.array(sampler(**args))
        distinct = len(np.unique(pts, axis=0))
        print(
            f"{seed:>6}  {len(pts):>6}  {distinct:>8}  "
            f"[{pts[0][0]:+.6f} {pts[0][1]:+.6f}]"
        )
    print("\nExpected if correct: 8 distinct.  Observed: 1, for every seed.")

    print(
        "\nUNSEEDED (seed=None) is fine — the defect is created BY seeding, which is\n"
        "the practice the package recommends for reproducibility:"
    )
    sampler, args = euclidean_space_to_sampler(
        EuclideanSpace.GAUSSIAN_BALL, num_dimensions=2, seed=None
    )
    args["num_points"] = 8
    pts = np.array(sampler(**args))
    print(f"  distinct points, seed=None: {len(np.unique(pts, axis=0))} of {len(pts)}")


# ---------------------------------------------------------------------------
# 2. The rejection branch — how often does it actually fire?
# ---------------------------------------------------------------------------
def section_2(trials: int = 2000) -> None:
    rule("2. Does the rejection branch 'almost never' fire?  (No — about a third.)")
    sigma, radius, dims = 0.33, 0.5, 2
    outside = 0
    for seed in range(trials):
        rng = np.random.default_rng(seed)
        point = rng.normal(loc=0.0, scale=sigma, size=dims)
        if np.linalg.norm(point) > radius:
            outside += 1
    analytic = math.exp(-(radius**2) / (2 * sigma**2))  # Rayleigh tail, 2-D
    print(f"  first draw lands OUTSIDE the ball: {outside}/{trials} "
          f"= {100 * outside / trials:.1f}%")
    print(f"  analytic (Rayleigh tail, sigma={sigma}, r={radius}, d={dims}): "
          f"exp(-r^2/2s^2) = {100 * analytic:.1f}%")
    print(
        "\nSo an early draft's 'the branch effectively never runs' was wrong. It does\n"
        "not matter: the defect is the seed PERSISTING in inner_sampler_args, so once\n"
        "any point is accepted, every later outer iteration re-draws that same point.\n"
        "Identical points with probability 1, not 'usually'."
    )


# ---------------------------------------------------------------------------
# 3. Defect 2 — candidate j lands on voter j.
# ---------------------------------------------------------------------------
def _collisions(num_voters: int, num_candidates: int, space: str, seed: int) -> int:
    v, c = sample_election_positions(
        num_voters=num_voters,
        num_candidates=num_candidates,
        num_dimensions=2,
        voters_positions=space,
        candidates_positions=space,
        seed=seed,
    )
    hits = 0
    for j in range(min(len(v), len(c))):
        if np.allclose(v[j], c[j]):
            hits += 1
    return hits


def section_3(trials: int = 200) -> None:
    rule("3. sample_election_positions: does candidate j land on voter j?")
    print(
        "Both _sample_points calls receive the same `seed`, and _sample_points does\n"
        "positions_args['seed'] = seed AFTER merging user args — so a caller cannot\n"
        "even work around it by passing per-side seeds.\n"
    )
    for nv, nc in ((5, 3), (4, 4)):
        k = min(nv, nc)
        print(f"  {nv} voters x {nc} candidates   "
              f"(a 'hit' = candidate j at exactly voter j; {k} comparable indices)")
        for space in SPACES:
            hit_all = 0
            for seed in range(trials):
                if _collisions(nv, nc, space, seed) == k:
                    hit_all += 1
            verdict = "COLLIDES" if hit_all == trials else (
                "clean" if hit_all == 0 else "mixed")
            print(f"    {space:<20} every index collides in "
                  f"{hit_all:>4}/{trials} seeds   {verdict}")
        print()
    print(
        "The escape at unequal counts is NOT protective and NOT rejection sampling:\n"
        "ball_uniform is the direct polar method with no rejection at all. It draws\n"
        "rng.normal(size=(num_dimensions, num_points)) — a DIMENSION-major array — so\n"
        "the mapping from stream position to (point, coordinate) depends on the point\n"
        "count. Change the count and the correspondence scrambles; make the counts\n"
        "equal and it lines back up. That is an accident of array shape."
    )


# ---------------------------------------------------------------------------
# 4. Which sampler consumes the stream which way (the mechanism behind 3).
# ---------------------------------------------------------------------------
def section_4() -> None:
    rule("4. Why the shape decides it: same seed, 5 points vs 3 points")
    seed = 42
    for name, fn in (("cube (point-major)", cube), ("ball_uniform (dim-major)", ball_uniform)):
        five = np.array(fn(num_points=5, num_dimensions=2, seed=seed))
        three = np.array(fn(num_points=3, num_dimensions=2, seed=seed))
        same = sum(1 for j in range(3) if np.allclose(five[j], three[j]))
        print(f"  {name:<26} point j identical in both runs: {same}/3")
    print(
        "\n  cube  does rng.random((num_points, num_dimensions))  -> C-order, row per\n"
        "        point, so point j owns stream slots [j*d, j*d+d) whatever n is.\n"
        "  ball_uniform does rng.normal(size=(num_dimensions, num_points)) -> the\n"
        "        first n draws are the x-coordinate of every point. n changes, the\n"
        "        whole correspondence shifts."
    )


# ---------------------------------------------------------------------------
# 5. Downstream: pref_voting.generate_profile.
# ---------------------------------------------------------------------------
def section_5(trials: int = 300) -> None:
    rule("5. Downstream — pref_voting.generate_profile(probmodel='euclidean')")
    from pref_voting.generate_profiles import generate_profile

    print("  space               distinct profiles over "
          f"{trials} seeds   (5 voters, 3 candidates)")
    for space in SPACES:
        seen = set()
        for seed in range(trials):
            prof = generate_profile(
                3, 5, probmodel="euclidean", space=space, num_dimensions=2, seed=seed
            )
            seen.add(tuple(tuple(r) for r in prof.rankings))
        print(f"    {space:<20} {len(seen):>4}")
    print(
        "\n  gaussian_ball returns ONE profile for every seed: all voters collapse to a\n"
        "  single point AND the candidates collapse onto that same point, so every\n"
        "  distance is zero, every ballot is a total tie, and the ranking that comes\n"
        "  back is index order. That is the shape a Condorcet-cycle sweep reads as a\n"
        "  suspiciously clean 0.00%.\n"
        "\n  The other five look healthy on THIS count — 5 != 3 — which is exactly why\n"
        "  the duplication has to be checked separately (section 3), and why filing\n"
        "  'pref_voting users are affected' flatly would have been refuted in one line\n"
        "  by a maintainer testing the default path."
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--section", type=int, choices=range(1, 6), action="append")
    args = ap.parse_args()
    wanted = args.section or list(range(1, 6))

    print(f"prefsampling {prefsampling.__version__} · numpy {np.__version__}")
    print(f"spaces: {', '.join(SPACES)}")

    for n in wanted:
        {1: section_1, 2: section_2, 3: section_3, 4: section_4, 5: section_5}[n]()


if __name__ == "__main__":
    main()
