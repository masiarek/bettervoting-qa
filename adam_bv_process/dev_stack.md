# Running the app locally

For changing BetterVoting itself — a UI fix, a results page, an API change. Nothing here is needed to edit documentation; see [docs_site.md](docs_site.md) for that.

The full write-up, including the two setups and seven hard-won gotchas, lives in the library repo: **[running_bettervoting_locally.md](https://github.com/masiarek/star-voting-library/blob/master/07_Concepts/tabulation_engines/BV/tabulation_engine/running_bettervoting_locally.md)**. This page is the short start/stop card; go there when something breaks.

## Use the script

The commands below are what `./bv` runs; prefer the script, which also gets the three things this page used to get wrong (see [Quick diagnosis](#quick-diagnosis)).

```bash
./bv status
```

`status` says what's up and whether the clone you're in can even run. Then `bv prep <clone>` for a cold one, `bv up` to start, `bv down` to stop. `bv up` with no argument uses the clone you're standing in.

## Which setup

| I want to… | Use |
|:---|:---|
| Click through the UI — vote, create an election, check a results page | **dev flow** (`localhost:3000`) |
| Run the Playwright E2E suite | **docker compose** |
| Unit tests, `tsc`, lint | neither — just `npm` |

The Docker stack is an E2E harness, **not** for manual clicking: it serves at `http://web:5000`, which isn't a secure context, so `crypto.randomUUID` is missing and the Create Election wizard silently does nothing.

## Start — dev flow

From `/Volumes/T7/Voting/BetterVoting/BV/bettervoting`:

```fish
docker compose down                                    # if the E2E stack is up, frees 5432/8080
brew services start postgresql@16
docker compose up -d --build keycloak
npm run build -w @equal-vote/star-vote-shared          # only if you edited packages/shared/
npm run dev -w @equal-vote/star-vote-backend           # terminal 1 — wait for "Server started on port 5001"
npm run dev -w @equal-vote/star-vote-frontend          # terminal 2 — opens localhost:3000
```

Frontend `localhost:3000` · backend `localhost:5001` · keycloak `localhost:8080` · postgres `localhost:5432`.

**Login:** `admin`/`admin` is the Keycloak *master console*, not an app user — it will always fail. Register your own Dev-realm user at `localhost:8080`.

## Stop — dev flow

```fish
# 1. the two dev servers: Ctrl+C in each terminal, or if one is orphaned:
pkill -f "tsx watch"

# 2. keycloak (and anything else in the compose stack):
docker compose down

# 3. postgres — usually worth leaving up:
brew services stop postgresql@16
```

## Start / stop — E2E stack

```fish
docker compose up --build     # runs the Playwright suite automatically
docker compose down           # stop and remove
```

## Quick diagnosis

| Symptom | Cause |
|:---|:---|
| `EADDRINUSE :5001` | stray backend — kill it **by port**, `kill $(lsof -ti tcp:5001)`. Not `pkill -f "tsx watch"`: that matches the two supervisor processes but **not** the child actually bound to the port (whose command line reads `node --require …/tsx/dist/preflight.cjs`), so it looks like it worked and the port stays held. |
| port 5000 in use | Two causes. Either macOS AirPlay Receiver (turn it off in System Settings), **or** — far more likely here — a backend started with no `.env`: see below. |
| UI loads but every API call fails, no error anywhere | The backend is on **5000** while the frontend proxies to **5001**. `.env` is gitignored, so a fresh clone has none, and `packages/backend/src/index.ts:10` reads `process.env.BACKEND_PORT \|\| 5000` — it starts *successfully* on the wrong port. `bv prep <clone>` copies a good `.env` in. |
| `Bind for 0.0.0.0:8080 failed: port is already allocated` | You ran `docker compose up keycloak` from a **second clone**. Compose names the project after the clone directory, so it tried to build an independent keycloak fighting for the same host port. One keycloak serves every clone — always start it from `BV/bettervoting`, and clear the orphan with `docker rm <clone>-keycloak-1 && docker network rm <clone>_star-net`. |
| `Module not found: @equal-vote/star-vote-shared/...` | rebuild shared: `npm run build -w @equal-vote/star-vote-shared` |
| `Could not read package.json` | you're in your home dir — `cd` to the repo root |
| `node: command not found` | `fish_add_path /usr/local/opt/node@20/bin` |
| `__META_TITLE__` in the browser tab | **normal** under the dev flow — meta injection only runs in the backend-served build |

## Sandbox — no local stack needed

For checking how a tabulation renders without running anything, <https://bettervoting.com/sandbox> tabulates with live code and mints nothing. Caveat: Race Details is permanently `Loading...` there, so table-level checks still need a real election.
