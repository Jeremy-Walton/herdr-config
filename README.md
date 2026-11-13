# Herdr.app config

My setup for running several coding agents at once in the [Herdr](https://herdr.dev) desktop app on macOS, each on its own branch.

Based on Gavin O'Melia's [herdr-config](https://github.com/gavinomelia/herdr-config), which does the same for the herdr TUI on Linux.

- `herdr-app/layouts/islands.json` and `herdr-app/mods/islands-*`: my Herdr layout. Its status bar links to the portless servers running in the shown space and to the open PR for its branch.
- `herdr-app/themes/cobalt2.json`: the dark theme I use with it.
- `herdr-app/settings.json` and `herdr-app/sounds/silent.mp3`: my Herdr settings. The blocked-agent sound is silenced because a hook already plays one.
- `herdr-app/keys.wt.json`: the Herdr key bindings for [wt](https://github.com/gavinomelia/wt), to merge into `~/.config/herdr-app/keys.json`.

## Worktrees with wt

[wt](https://github.com/gavinomelia/wt) gives every branch its own git worktree. It's its own tool and knows nothing about Herdr: its [herdr-app](https://github.com/gavinomelia/wt/tree/main/examples/herdr-app) scripts connect the two, and add the Herdr-only commands `wt key`, `wt scratch`, `wt layout`, and `wt review`.

`wt new` (cmd+shift+t) asks for a branch, a Linear issue (`ABC-1234`), or a PR (`pr:1234`). It then opens a space with:

1. a **code** tab: the agent (Claude, or Codex with cmd+alt+t) on the left, a shell on the right, and `$WT_EDITOR_COMMAND` under the agent if it's set;
2. a **server** tab that runs `wt serve`, when the project sets `WT_SERVE`.

For a Linear issue the agent starts by reading the issue, and for a PR, by reading the PR. A branch that already has a space gets it shown. A worktree whose space was closed gets a new one, in which Claude continues its last conversation.

| Key | Runs | What it does |
|---|---|---|
| cmd+shift+t | `wt new` | New worktree space (cmd+alt+t uses Codex) |
| cmd+shift+s | `wt scratch` | A space on the main checkout with no branch, for questions |
| cmd+shift+o | `wt open` | Opens this checkout's URL in the browser |
| cmd+shift+r | `wt review` | A read-only Codex review of this branch beside the focused pane |
| cmd+alt+w | `wt ls` | Every worktree with its PR, CI, and changes |
| cmd+alt+shift+w | `wt prune` | Removes worktrees whose PR merged, and asks about abandoned ones |

The keys run `wt` in the focused terminal's folder, so they act on the project that terminal is in.

How an app gets its own databases and URL per branch is project setup, not Herdr. That's the [rails-postgres](https://github.com/gavinomelia/wt/tree/main/examples/rails-postgres) example in the wt repo, with per-project settings in `~/.config/wt/projects/<repo>.env`.

## Install

```sh
git clone https://github.com/Jeremy-Walton/herdr-config ~/Workspace/herdr-config
cp -R ~/Workspace/herdr-config/herdr-app/layouts ~/Workspace/herdr-config/herdr-app/mods ~/Workspace/herdr-config/herdr-app/themes ~/Workspace/herdr-config/herdr-app/sounds ~/Workspace/herdr-config/herdr-app/settings.json ~/.config/herdr-app/
herdr-app do layout.switch --name islands
herdr-app do app.theme --name cobalt2
```

These are copies, so after changing the layout in Herdr, copy it back here before committing.

For the worktree keys, install wt from source and link it where Herdr's terminals find it. A source install keeps `wt` off nodenv's per-version shims:

```sh
git clone https://github.com/gavinomelia/wt ~/src/wt
ln -s ~/src/wt/bin/wt ~/.local/bin/wt
```

Then run `wt init` in each project's main checkout. Pick `herdr-app` when it asks where worktrees open. It copies the scripts to `~/.config/wt/herdr-app/` and writes `~/.config/wt/config`. Delete the `WT_MAIN` line it adds there, so the keys act on the focused terminal's project. Then merge `herdr-app/keys.wt.json` into `~/.config/herdr-app/keys.json`.

To upgrade wt, run `git -C ~/src/wt pull`.
