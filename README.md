# wt for Herdr.app

My setup for running several coding agents at once in the [Herdr](https://herdr.dev) desktop app on macOS, each on its own branch of a Rails app.

Based on Gavin O'Melia's [herdr-config](https://github.com/gavinomelia/herdr-config), which does the same for the herdr TUI on Linux. This port drives Herdr.app through `herdr-app do`, runs on macOS's bash 3.2, and clones files with APFS clones instead of btrfs reflinks.

- `bin/wt`: gives every branch its own worktree, Herdr space, databases, and browser URL.
- `app/worktree_auto_login.rb`: a dev-only initializer that signs each worktree's browser straight in as one user.
- `herdr-app/keys.wt.json`: the Herdr key bindings for `wt`, to merge into `~/.config/herdr-app/keys.json`.
- `herdr-app/layouts/islands.json` and `herdr-app/mods/islands-*`: my Herdr layout. Its status bar links to the portless servers running in the shown space.
- `herdr-app/themes/cobalt2.json`: the dark theme I use with it.
- `herdr-app/settings.json` and `herdr-app/sounds/silent.mp3`: my Herdr settings. The blocked-agent sound is silenced because a hook already plays one.

## What `wt` does

`wt new` (cmd+shift+t) asks for a branch, a Linear issue (`ABC-1234`), or a PR (`pr:1234`), then:

1. creates the worktree;
2. opens a Herdr space with a **code** tab: the agent (Claude, or Codex with `WT_AGENT=codex`) on top, a shell along the bottom, and `$WT_EDITOR` to the right if it's set;
3. opens a **server** tab that runs `wt setup`, then `wt serve`.

For a Linear issue the agent starts by reading the issue. For a PR it starts by reading the PR.

If the branch already has a worktree, `wt new` switches to its space. If it has no open space, it opens one, and Claude continues its last conversation in that checkout.

`wt setup` gives the worktree its own dev database (cloned from a snapshot of the main one), its own test databases for parallel specs, symlinked credentials keys, and clones of `node_modules` and built assets. Each worktree's databases are named in its `.env_overrides.rb`.

On PostgreSQL 18 or later, `wt setup` and `wt snapshot` set `file_copy_method = clone` for their own session, so each new database shares its files with the source (APFS clones) and does not use a full copy. An 8 GB database clones in under a second and uses almost no disk space. The server's settings do not change. On an older Postgres, `wt` makes full copies. See [Instant database clones](https://boringsql.com/posts/instant-database-clones/) for how it works.

| Command | Key | What it does |
|---|---|---|
| `wt new [target] [base]` | cmd+shift+t | New worktree space (cmd+alt+t uses Codex) |
| `wt scratch` | cmd+shift+s | A space on the main checkout with no branch, for questions |
| `wt open` | cmd+shift+o | Opens this checkout's URL in the browser |
| `wt review [base]` | cmd+shift+r | Starts a read-only Codex review of this branch beside the focused pane |
| `wt ls` | cmd+alt+w | Every worktree with its PR, CI, uncommitted files, commits behind and ahead of main, unpushed commits, and age |
| `wt prune` | cmd+alt+shift+w | Removes clean worktrees whose PR merged and deletes their branches; asks about ones whose PR closed or that sat idle; deletes merged branches without a worktree; leaves `gh stack` branches alone |
| `wt rm [--force] <branch>` | | Closes the space, removes the worktree, drops its databases |
| `wt gc [--dry-run]` | | Drops every database no checkout names, however the checkout was removed |
| `wt snapshot` | | Refreshes the idle dev-database copy new worktrees clone from |

Run `wt` with no arguments for the full help.

## Requirements

- Herdr.app with `herdr-app` on your `PATH`, `git`, `gh` (signed in), `jq`, `psql`, `python3`
- [portless](https://github.com/vercel-labs/portless) for the per-branch `https://<branch>.<app>.localhost` URLs
- The Claude Code CLI with the Linear connector, for `wt new ABC-1234`
- Codex, for `wt review`
- A Rails app that loads a git-ignored `.env_overrides.rb`, reads its database names from `DATABASE_NAME` and `DATABASE_TEST_NAME`, allows `ENV['ADDITIONAL_HOST']` in `config.hosts`, and has a `Procfile.pdev`

## Install

```sh
git clone <this repo> ~/.config/wt
ln -s ~/.config/wt/bin/wt ~/.local/bin/wt
cp ~/.config/wt/wt.env.example ~/.config/wt/wt.env   # then fill it in
```

Merge `herdr-app/keys.wt.json` into `~/.config/herdr-app/keys.json`, changing each `/path/to/your/app` to your app's main checkout.

For the layout, copy its files into Herdr's folder, then switch to it:

```sh
cp -R ~/.config/wt/herdr-app/layouts ~/.config/wt/herdr-app/mods ~/.config/wt/herdr-app/themes ~/.config/wt/herdr-app/sounds ~/.config/wt/herdr-app/settings.json ~/.config/herdr-app/
herdr-app do layout.switch --name islands
herdr-app do app.theme --name cobalt2
```

These are copies, so after changing the layout in Herdr, copy it back here before committing.

## Cleaning up

`wt gc` runs inside `wt new`, `wt rm`, and `wt prune`. It keeps the main checkout's databases, the snapshot, and whatever each checkout's `.env_overrides.rb` names, and drops every other database starting with the prefix. Anything else that makes checkouts of the app must write its database names to `.env_overrides.rb` before creating them, or `wt gc` will drop them.
