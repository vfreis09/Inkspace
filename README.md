# Inkspace

> Real-time collaborative whiteboard for infinite creativity

A collaborative canvas application where multiple users can draw, design, and brainstorm together in real time. Built to showcase modern full-stack web development and real-time architecture.

## 🎯 What It Is

Inkspace is a web-based infinite canvas built on Konva. It implements its own interaction layer (selection, transforms, snapping, layering, undo/redo) and its own real-time sync protocol instead of wrapping an existing whiteboard product.

- **Custom canvas engine:** shapes, pen, text, selection, transforms and layering built on Konva.js.
- **Multiplayer sync:** real-time shape updates broadcast over WebSockets (Partykit) and persisted to PostgreSQL. Conflicts are resolved last-write-wins per shape property.
- **Presence:** live cursors with user names and an online-users indicator.
- **Infinite canvas:** pan and zoom with a live coordinate/zoom HUD, home and zoom-to-fit controls.
- **Permissions:** owner, editor and viewer roles, invite links, email invites, and guest access on public boards.
- **Version history:** automatic board snapshots that the owner can restore.
- **Dark and light themes** across the whole app.

## 🚀 Tech Stack

### Frontend

- **Next.js 16** (App Router)
- **React 19** with the React Compiler enabled
- **TypeScript**
- **Konva / react-konva** - 2D canvas rendering
- **Zustand** - state management (with Immer for color updates)
- **Tailwind CSS v4** and **shadcn/ui**
- **next-themes** - light/dark theming
- **lucide-react** - icons

### Backend

- **Next.js API routes** (route handlers plus controller/service layers)
- **Prisma** ORM
- **PostgreSQL** hosted on **Neon**

### Real-Time

- **Partykit** - WebSocket rooms for shape sync, cursors and presence. The server batches edits and flushes them to the database through an authenticated API endpoint.

### Auth

- **Clerk** - authentication (modal sign-in) and user management. Board permissions use short-lived signed tokens for the WebSocket connection.

### Deployment

- **Vercel** - frontend and API
- **Partykit** - real-time server

## 🏗️ Architecture

- **Canvas layer (Konva):** renders shapes sorted by an explicit `order` value, plus the grid, snap guides, selection box and transformer.
- **State layer (Zustand):** shapes, selection, tool state and a custom action history (`ADD`, `UPDATE`, `UPDATE_BATCH`, `DELETE`) that powers undo/redo. Every local action is also broadcast.
- **Sync layer (Partykit):** a room per board relays shape add/update/delete messages, enforces roles server-side, and debounces writes to the database. Periodic snapshots are created for version history.
- **Persistence layer (Prisma + Postgres):** boards, members, shapes and snapshots.

## ✨ Features

### Canvas

- Infinite canvas with pan and zoom
- Shapes: rectangle, circle, line, arrow, free-hand pen, text
- Select, move, resize and rotate, with multi-select (shift-click and drag-select)
- Undo / redo, including multi-shape actions
- Layer ordering: bring to front, send to back, forward, backward
- Smart alignment guides with snapping while dragging
- Color picker with fill, stroke and brush size
- Home (reset view) and zoom-to-fit controls
- Coordinate and zoom HUD
- Grid toggle
- Clear board
- Export as PNG (framed to content, matches the current theme)

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| V / H / R / O / L / A / P / T | Select, pan, rectangle, circle, line, arrow, pen, text |
| Delete / Backspace | Delete selection |
| Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) | Undo / redo |
| Ctrl+A | Select all |
| Escape | Deselect |
| Arrow keys (Shift for 10px) | Nudge selection |
| Ctrl+] / Ctrl+[ | Bring forward / send backward |
| Ctrl+Shift+] / Ctrl+Shift+[ | Bring to front / send to back |

### Collaboration

- Multiple users on the same board in real time
- Live cursors with names and colors
- Presence indicators
- Share by link or invite by email
- Roles: owner, editor, viewer
- Guest access for public boards
- Owner can change roles, remove members and restore snapshots

## 🗺️ Roadmap

### Done ✅

- **Canvas basics:** pan/zoom, shapes, selection and transforms, undo/redo
- **Multiplayer:** shared boards, live cursors, real-time sync, presence
- **Collaboration:** sharing, permissions, snapshots / version history
- **Advanced tools:** pen, text, layers, alignment guides
- **Polish:** keyboard shortcuts, PNG export, dark mode, zoom-to-fit, coordinate HUD

### In progress 🚧

- **Performance optimization:** viewport culling, layer separation, render isolation for cursors and HUD, batched database writes. Benchmarks will be added here. <!-- TODO: fill in before/after numbers -->

### Planned 📋

- Group / ungroup shapes
- Real-time comments
- Undo/redo buttons in the toolbar
- Replace browser alerts and prompts with modals
- Unit tests for layer, snapping and culling logic

### Intentionally out of scope

- SVG and PDF export (PNG covers the use case)
- Brush-style eraser (Delete covers the use case)
- Right-click context menu (every action is already reachable elsewhere)

## 🎯 Goals

This project demonstrates:

- Real-time architecture with WebSockets and server-side permission checks
- State management for collaborative editing, including undo/redo that also syncs
- Canvas rendering and interaction design (snapping, transforms, layering)
- Authentication and role-based access control
- Modern full-stack TypeScript development

## ⚠️ Known limitations

- Concurrent edits to the same property of the same shape resolve last-write-wins; there is no CRDT.
- Undo/redo history is local to each user and is cleared on reload.
- Alignment guides snap against the dragged shape only, not the bounding box of a multi-selection.
- Rect-select and bounding boxes don't account for rotation.

## 🛠️ Getting Started

<!-- TODO: add your setup steps: env vars (DATABASE_URL, Clerk keys, PARTYKIT_SECRET, NEXT_PUBLIC_PARTYKIT_HOST, NEXT_PUBLIC_APP_URL), prisma migrate, running Next.js and Partykit dev servers -->

## 📝 License

MIT

## 🤝 Contributing

This is a portfolio project, but feedback and suggestions are welcome!

---

**Built by Vicente Fernandes** | [Portfolio](https://vfreis09.github.io/) | [LinkedIn](https://www.linkedin.com/in/vicente-fernandes-339005155/)