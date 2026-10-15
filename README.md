# Inkspace

> Real-time collaborative whiteboard for infinite creativity

A collaborative canvas application where multiple users can draw, design, and brainstorm together in real time. Built to showcase modern full-stack web development and real-time architecture.

<!-- TODO: add a screenshot or GIF of the board here -->

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
- **Neon** - serverless PostgreSQL

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
- Undo / redo, including multi-shape actions (keyboard shortcuts and toolbar buttons)
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

- **Canvas basics:** pan/zoom, shapes, selection and transforms, undo/redo (shortcuts and toolbar buttons)
- **Multiplayer:** shared boards, live cursors, real-time sync, presence
- **Collaboration:** sharing, permissions, snapshots / version history
- **Advanced tools:** pen, text, layers, alignment guides
- **Polish:** keyboard shortcuts, PNG export, dark mode, zoom-to-fit, coordinate HUD

### In progress 🚧

- **Performance optimization:** viewport culling, layer separation, render isolation, batched database writes. Baseline numbers are in the Performance section below.

### Planned 📋

- Group / ungroup shapes
- Real-time comments
- Replace browser alerts and prompts with modals
- Unit tests for layer, snapping and culling logic

### Intentionally out of scope

- SVG and PDF export (PNG covers the use case)
- Brush-style eraser (Delete covers the use case)
- Right-click context menu (every action is already reachable elsewhere)

## 📈 Performance

Baseline measured before the optimization work, on a production build.

**Setup:** AMD Ryzen 5 5600G, 32 GB RAM, Chrome 150.0.7871.114 (64-bit), `npm run build && npm run start`.
FPS read from Chrome DevTools > Rendering > Frame Rendering Stats, single run per cell, so values are approximate.
Test shapes come from a dev-only stress tool: a random mix of rectangles, circles, lines, arrows and freehand strokes (82 points each, the heaviest shape type), spread over ±4000 world units.

| Scenario (FPS) | 0 shapes | 1,000 shapes | 2,000 shapes |
|---|---|---|---|
| Wheel zoom | 50 | 25 | 17 |
| Pan | 49 | 40 | 36 |
| Drag one shape | 58 | 48 | 28 |

An empty board already runs at about 50 FPS on zoom and pan, so part of the cost is independent of shape count.

After-optimization numbers will be added here once the work is done.

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
- Large boards (1,000+ shapes) are slow while performance work is in progress; see the Performance section.

## 🛠️ Getting Started

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (the project uses [Neon](https://neon.tech))
- A [Clerk](https://clerk.com) application
- A [Partykit](https://partykit.io) project (or the local dev server)

### 1. Install

```bash
git clone <https://github.com/vfreis09/Inkspace>
cd inkspace
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```bash
# Database (use Neon's pooled connection string; the host contains "-pooler")
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Partykit
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
PARTYKIT_HOST=http://localhost:1999
PARTYKIT_SECRET=

# App URL (used by the Partykit server to call the API)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Variable names are taken from the code. Check the Clerk dashboard for the exact key names your version expects.

### 3. Database

```bash
npx prisma migrate dev
```

### 4. Run

Start both servers in separate terminals:

```bash
# Next.js app
npm run dev

# Partykit real-time server
npx partykit dev
```

Open http://localhost:3000.

### Optional: stress-test tool (development only)

To load many shapes locally for performance testing, add this to `.env`:

```bash
NEXT_PUBLIC_ENABLE_STRESS=true
```

Then run `stress(1000)` in the browser console on a board, and `stressClear()` to remove them. Shapes are local only and are never saved or broadcast. Do not set this variable in production.

## 📝 License

MIT

## 🤝 Contributing

This is a portfolio project, but feedback and suggestions are welcome!

---

**Built by Vicente Fernandes** | [Portfolio](https://vfreis09.github.io/) | [LinkedIn](https://www.linkedin.com/in/vicente-fernandes-339005155/)