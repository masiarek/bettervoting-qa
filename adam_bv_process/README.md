# adam_bv_process — starting and stopping things

Runbook for Adam's local BetterVoting work: what to start, what to stop, and which checkout to be in. Written 2026-08-08 after a session that ended with three stray containers and a dev server serving an empty directory.

There are **two separate jobs** and they share almost nothing. Pick one before you start anything.

| I want to… | Use | Ports |
|:---|:---|:---|
| **Change the app** — a UI fix, a results page, an API change | [the dev stack](dev_stack.md) | 3000 · 5001 · 8080 · 5432 |
| **Change a help page** on docs.bettervoting.com | [the docs site](docs_site.md) | 4000 |

The docs site is **not** part of the app's `docker-compose.yml`. Running the app does nothing for the docs, and previewing the docs needs none of the app. Confusing the two is the main way to waste half an hour.

For the app, **start with the script rather than this page** — `./bv status` answers "what's already running" and "can this clone even run" in one call:

```bash
./bv status
```

## The checkouts

Adam runs **one clone per in-flight PR**, so the branch you want is usually already checked out somewhere rather than something to create.

| Path under `/Volumes/T7/Voting/BetterVoting/` | What it's for |
|:---|:---|
| `BV/bettervoting` | the **dev-flow checkout** — run the app from here |
| `bv-copy-fix`, `bv-ballot-notice`, `bv-bulk-archive`, `bv-rr-highlight` | one clone per open PR branch |
| `bettervoting-qa` | **this repo** — QA notes, analysis, this runbook |

All the `bv-*` clones have `origin` = `Equal-Vote/bettervoting` and `fork` = `masiarek/star-server`. **The fork was never renamed** after upstream became `bettervoting`, so `gh` needs explicit flags — see [docs_site.md](docs_site.md#opening-the-pr).

Before starting work in a clone, check which branch it's on (`git branch --show-current`) and put it back when you're done. It's easy to leave a clone somewhere unexpected.

## Stop everything

The one command that ends a session cleanly:

```bash
docker stop $(docker ps -q)
```

That stops containers without deleting them — nothing is lost, and each starts again with the commands in the two pages above. To see what's running first:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

Things that do **not** stop with that command, because they aren't containers:

- **The dev servers** (`npm run dev` for backend and frontend) — `Ctrl+C` in each terminal, or `pkill -f "tsx watch"` for a stray backend holding port 5001.
- **Homebrew Postgres** — `brew services stop postgresql@16`. Usually worth leaving running.

### What to leave alone

- **`bettervoting-keycloak-1`** is long-lived — it may have been up for days and is part of the app stack, not any one session. Stopping it is safe but you'll need it again for local app work.
- **The `bvdocs-gems` volume** caches ~96 Jekyll gems and is what makes the docs preview start in seconds instead of minutes. Keep it. Only delete (`docker volume rm bvdocs-gems`) to reclaim disk.

## Before you publish anything

Read the [ground rules](../README.md#ground-rules) in this repo's README first — **no credentials on any page**, and anything sharper than a UI or copy defect goes to Arend *before* it goes on a public page or into a PR description. That rule catches more than obvious security findings: a docs page describing a guard that isn't enforced is in scope too.
