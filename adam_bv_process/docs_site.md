# Changing a help page on docs.bettervoting.com

The docs site is Jekyll + [just-the-docs](https://just-the-docs.com), built by **GitHub Pages straight from the `docs/` folder** of `Equal-Vote/bettervoting`. There's no build workflow and no `docs` service in `docker-compose.yml` — the app stack does nothing for the docs and vice versa.

## Which way to edit

**Small change — a typo, a sentence, a link:** edit on GitHub in the browser. That's what BV's own guide recommends and it's genuinely the fastest path. You don't need any of the below.

**New page, or moving things around:** preview locally. Three things aren't visible in the GitHub editor:

- whether `parent:` in your front matter matched (a mismatch means the page silently never appears in the sidebar);
- what the page actually looks like — GitHub previews Markdown, not this site;
- where the page lands in the nav, which is relative to every sibling.

## Start the preview

From the `docs/` folder of whichever clone you're working in:

```bash
docker run --rm -v "$PWD":/site -w /site -v bvdocs-gems:/usr/local/bundle -p 4000:4000 ruby:2.7 sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0 --port 4000"
```

Then open <http://localhost:4000>. Edits rebuild automatically — just refresh.

First run installs ~96 gems and takes a few minutes; the `bvdocs-gems` volume caches them so later starts are about 7 seconds.

## Stop the preview

`Ctrl+C` in that terminal. If it's detached:

```bash
docker ps --filter "publish=4000" --format "{{.Names}}"   # find it
docker stop <name>
```

**`Bind for 0.0.0.0:4000 failed: port is already allocated`** means a previous preview is still up — stop that one first.

## Gotchas

- **`cd` into `docs/` first.** The command mounts `$PWD` as the site, so running it from your home directory tries to build your home directory.
- **Don't delete `docs/_site` while a server is running.** It'll keep answering and return *"`/` not found"* for everything.
- **The `Gemfile` may not be on your branch.** It's added by [PR #1501](https://github.com/Equal-Vote/bettervoting/pull/1501); until that merges, branches cut from `main` won't have it. Copy it in untracked and don't commit it:
  ```bash
  git show docs/local-preview:docs/Gemfile > docs/Gemfile
  ```
- **`No repo name found. Specify using PAGES_REPO_NWO...`** — a Pages plugin needs to know which repo this is, and the command mounts only `docs/`, so `.git` is outside the container. Add `-e PAGES_REPO_NWO=Equal-Vote/bettervoting`.
- **Don't use the `jekyll/jekyll` images.** They're unmaintained and the tags you'd expect (`3.9`) no longer exist. `ruby:2.7` + the `github-pages` gem is what Pages itself runs.

## Writing rules

**Front matter** — every page needs it, and `parent:` must match the parent page's `title:` **character-for-character, emoji included**:

```yaml
---
layout: default
title: Election States
nav_order: 1
parent: BetterVoting Documentation
---
```

**Links: use the `.md` form.** `[Preliminary Results](preliminary_results.md)` works both on the published site (a plugin rewrites it to `.html`) and when reading the source on GitHub. Bare `.html` only works on the site.

**Literal `{{...}}` must be wrapped in `{% raw %}…{% endraw %}`** — Liquid runs over page source before Markdown, *including inside code fences*, and will silently eat anything it can parse. This broke a live page for months because it looks perfect in GitHub's preview.

**Sidebar structure is front matter, not folders.** just-the-docs builds the nav from `parent:`, not from directory layout, so sections can be reorganised without moving files or changing URLs. That matters because **six doc URLs are hardcoded in the app** (two as deep anchors, so heading text is load-bearing), and **redirects don't work today** — `redirect_from:` emits nothing until `plugins: [jekyll-redirect-from]` is added to `_config.yml`. So: re-parent, don't move.

## Opening the PR

Branch off `origin/main`, not off whatever the clone happens to be on.

```bash
git checkout -b docs/<name> origin/main
# ... edit, preview, commit ...
git push fork docs/<name>
gh pr create --repo Equal-Vote/bettervoting --base main --head masiarek:docs/<name> --title "..." --body-file <file>
```

The explicit `--repo` and `--head masiarek:` are needed because the fork is still named `star-server` while upstream renamed to `bettervoting`; plain `gh pr create` guesses wrong.

Add `--draft` when the PR is a proposal for discussion rather than something to merge.

## Before publishing

Re-read this repo's [ground rules](../README.md#ground-rules). A docs page that describes a guard which isn't enforced counts as a finding, not just documentation — raise it with Arend before it goes in a public PR description.
