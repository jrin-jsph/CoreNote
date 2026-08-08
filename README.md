# Corenote

> A terminal-native dev journal & task manager — capture todos and notes without ever leaving your terminal.

No backend. No subscription. Your data lives in your own private GitHub repository.

---

## Why Corenote?

Developers spend most of their time in the terminal, but todo and note apps live outside it. Every time you need to jot something down, you break flow to open a browser tab or another app.

Corenote removes that switch entirely. One command, run from anywhere — even mid-build, mid-debug, mid-anything — captures your thought and syncs it across every machine you use.

```bash
$ npm run build
building modules 340/512...

$ cnte ": client wants the hero animation slower"
✔ noted

building modules 512/512... done
```

---

## Features

- **Zero context-switch capture** — add todos and notes without leaving your terminal
- **One smart command** — punctuation prefixes decide where content goes (todo, note, or custom section)
- **Automatic GitHub sync** — pull before every read, push after every write, no manual git commands
- **No manual setup** — GitHub OAuth login handles authentication and private repo creation for you
- **Human-readable storage** — one markdown file per day, editable in any text editor, renders as checklists on GitHub
- **Repo/branch-aware tagging** — entries auto-tag with your current project when run inside a git repo
- **Interactive mode** — full-screen terminal UI with arrow-key navigation
- **Smart conflict handling** — automatic merging across devices, no raw git conflict markers
- **Stats & streaks** — completion rate and daily activity, derived from your sync history
- **Fully private** — your data lives in your own GitHub account, not on a third-party server

---

## Installation

```bash
npm install -g corenote
```

### Requirements:

- **Node.js 18+**
- **Git** installed and available on your `PATH`
- A **GitHub account**

---

## Quick Start

```bash
# Set up — logs in via GitHub, creates your private data repo
cnte init

# Add a todo
cnte "fix ssl bug #backend !!2 @tomorrow"

# Add a note
cnte ": turned out to be a proxy cert issue, not code"

# View today's list
cnte list

# Launch interactive mode
cnte
```

---

## Entry Syntax

One command, prefix decides the type:

| Input | Stored as |
| --- | --- |
| `cnte "fix ssl bug"` | Todo |
| `cnte ": had a weird bug today"` | Note |
| `cnte "- maybe switch auth flow"` | Bullet (Ideas section) |
| `cnte "meeting: wants it slower"` | Custom section |

### Inline metadata for todos:

- `#tag` → adds a tag
- `!!1` `!!2` `!!3` → priority level
- `@tomorrow` → due date

---

## Command Reference

| Command | Description |
| --- | --- |
| `cnte init` | Log in with GitHub, set up your data repo |
| `cnte "<text>"` | Add an entry |
| `cnte list [--all] [--tag] [--priority] [--due] [--project]` | View and filter todos |
| `cnte done <id>` | Mark a todo complete |
| `cnte edit <id> "<text>"` | Edit an entry |
| `cnte undo` | Revert last action |
| `cnte carry` | Roll forward unfinished todos |
| `cnte show` / `cnte cat` | Print full day's file |
| `cnte write` | Open today's file in `$EDITOR` |
| `cnte stats` | View streaks and completion rate |
| `cnte whoami` | Show linked account and sync status |
| `cnte` (no args) | Launch interactive terminal UI |

---

## File Format

Each day is stored as a single markdown file, organized by section:

```markdown
# 2026-08-06

## Todos
- [ ] fix ssl bug #backend !!2 @tomorrow
- [x] push readme

## Notes
Turned out to be a proxy cert issue, not code.

## Ideas
- look into credential manager conflicts
```

Plain markdown — readable, git-diff-friendly, and editable outside the tool at any time.

---

## How Sync Works

- **Before reading** → automatically pulls the latest changes
- **After writing** → automatically commits and pushes
- **Offline** → falls back to local copy, syncs when reconnected
- **Conflicts** → automatically merged by combining entries across devices — you'll never see raw git conflict markers

---

## Tech Stack

- **Runtime:** Node.js
- **CLI framework:** Commander.js
- **Interactive UI:** Ink (React for terminal)
- **Styling:** Chalk
- **Sync:** Git + GitHub (no backend server)
- **Auth:** GitHub OAuth Device Flow
- **Token storage:** OS keychain

---

## Roadmap

- [ ] Shell prompt integration (pending count in PS1/starship)
- [ ] Weekly digest/summary command
- [ ] Recurring todos
- [ ] Export to calendar format

> **Explicitly out of scope:** real-time collaboration, push notifications, third-party integrations, Kanban view.

---

## Contributing

Issues and PRs welcome. Core areas currently in progress: conflict-merge reliability, OAuth flow polish, and interactive mode UX.
