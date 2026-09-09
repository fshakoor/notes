# notes

A private notes app that runs on your own machine. No accounts, no cloud, no tracking. Your notes
live in a single SQLite file and never leave your network.

It's a three pane layout like Apple Notes (folders, a list, and the editor), but the writing side
is closer to a code editor. Plain text with markdown, a monospace font by default, and the kind of
keyboard shortcuts you'd expect from Sublime.

It's meant to be self hosted and reached from your phone over Tailscale, so nothing is ever exposed
to the public internet.

## Features

- Folders, plus All Notes and Recently Deleted. Create, rename, and delete folders. Deleting a
  folder moves its notes to Recently Deleted instead of dropping them.
- The first line of a note becomes its title, the same as Apple Notes. A leading `#` is stripped so
  markdown headings still read as titles.
- Pin notes to the top, search across titles and bodies, and move notes between folders.
- Soft delete. Deleted notes sit in Recently Deleted where you can restore them or remove them for
  good.
- Autosave. There's no save button, edits are written back as you type.
- Markdown preview toggle for headings, lists, checkboxes, quotes, code, and links.
- Theme picker: OLED, dark, or light, an accent color, and the editor font (mono, sans, or serif)
  and size. Saved in the browser.

## The editor

The editor is a plain textarea with a set of key handlers, so it stays fast and light while still
feeling like a real editor:

- `Tab` / `Shift+Tab` to indent and dedent, across a whole selection.
- `Enter` continues a list. Bullets, numbered lines, and `- [ ]` checkboxes carry to the next line,
  and an empty item ends the list.
- `Alt+Up` / `Alt+Down` to move the current line up or down.
- `Cmd/Ctrl+Shift+D` to duplicate a line, `Cmd/Ctrl+Shift+K` to delete one.
- `Cmd/Ctrl+B` and `Cmd/Ctrl+I` wrap the selection in bold or italic.
- `Home` jumps to the first non whitespace character, then to the start of the line.

Everything goes through the browser's native edit path, so undo and redo walk back through real
edits one step at a time.

## Shortcuts

- `Cmd/Ctrl+N` new note
- `Cmd/Ctrl+F` or `/` focus search
- `Esc` close a dialog

## Requirements

Node 22.5 or newer. That's the only prerequisite. The database is Node's built in SQLite, so there's
no native build, no external database, and no Docker.

## Run it

```bash
git clone https://github.com/fshakoor/notes
cd notes
npm install
npm run dev
```

Open http://localhost:5189 and start writing. Your notes are saved to `server/data/notes.db`, back
them up by copying that file.

## Reaching it from your phone (Tailscale)

The dev client binds on all interfaces, so any device on your tailnet can open it. No port
forwarding, nothing public.

1. Run Tailscale on this machine and your phone (same tailnet).
2. On your phone, open `http://<this-machine>.ts.net:5189`, or `http://100.x.y.z:5189` using the
   tailnet IP from `tailscale ip`.

The API stays on localhost and the web app proxies `/api` to it, so only the notes page is reachable
over the tailnet.

## Production (one always-on process)

Build the client and let the server serve it and the API together on one port (5190):

```bash
npm run build
npm start
```

In production the server binds on all interfaces so tailnet devices can reach it directly.

## Security

There's no authentication by design. It's meant to run on your own machine and be reached over a
network you trust, like Tailscale or your home LAN, so don't expose the port to the public internet.
Your database is gitignored and never leaves your machine.

## Tech stack

Client: Vite, React, TypeScript, Tailwind.
Server: Fastify, TypeScript, and Node's built in SQLite.

## License

MIT. See [LICENSE](LICENSE).
