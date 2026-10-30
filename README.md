# Inkspace

> Real-time collaborative whiteboard for infinite creativity.

A collaborative canvas application where multiple users can draw, design, and brainstorm together in real time. Built to showcase modern full-stack web development and real-time architecture.

<!-- TODO: Add a screenshot or GIF of the board here -->

## 🎯 What It Is

Inkspace is a web-based infinite canvas built on Konva. It implements its own interaction layer (selection, transforms, snapping, layering, undo/redo) and its own real-time sync protocol instead of wrapping an existing whiteboard product.

- **Custom canvas engine:** Shapes, pen, text, selection, transforms, and layering built on Konva.js.
- **Multiplayer sync:** Real-time shape updates broadcast over WebSockets (PartyKit) and persisted to PostgreSQL. Conflicts are resolved last-write-wins per shape property.
- **Presence:** Live cursors with user names and an online-users indicator.
- **Infinite canvas:** Pan and zoom with a live coordinate/zoom HUD, home, and zoom-to-fit controls.
- **Permissions:** Owner, editor, and viewer roles, invite links, email invites, and guest access on public boards.
- **Version history:** Automatic board snapshots that the owner can restore.
- **Dark and light themes:** Across the whole app.

## 🚀 Tech Stack

### Frontend

- **Next.js 16** (App Router)
- **React 19** with the React Compiler enabled
- **TypeScript**
- **Konva / react-konva** - 2D canvas rendering
- **Zustand** - State management (with Immer for color updates)
- **Tailwind CSS v4** and **shadcn/ui**
- **next-themes** - Light/dark theming
- **lucide-react** - Icons

### Backend

- **Next.js API routes** (route handlers plus controller/service layers)
- **Prisma** ORM
- **PostgreSQL** hosted on **Neon**

### Real-Time

- **PartyKit** - WebSocket rooms for shape sync, cursors, and presence. The server batches edits and flushes them to the database through an authenticated API endpoint.

### Auth

- **Clerk** - Authentication (modal sign-in) and user management. Board permissions use short-lived signed tokens for the WebSocket connection.

### Deployment

- **Vercel** - Frontend and API
- **PartyKit** - Real-time server
- **Neon** - Serverless PostgreSQL

## 🏗️ Architecture

- **Canvas layer (Konva):** Renders shapes sorted by an explicit `order` value, plus the grid, snap guides, selection box, and transformer.
- **State layer (Zustand):** Shapes, selection, tool state, and a custom action history (`ADD`, `UPDATE`, `UPDATE_BATCH`, `DELETE`) that powers undo/redo. Every local action is also broadcast.
- **Sync layer (PartyKit):** A room per board relays shape add/update/delete messages, enforces roles server-side, and debounces writes to the database. Periodic snapshots are created for version history.
- **Persistence layer (Prisma + PostgreSQL):** Boards, members, shapes, and snapshots.

## ✨ Features

### Canvas

- Infinite canvas with pan and zoom
- Shapes: rectangle, circle, line, arrow, free-hand pen, and text
- Select, move, resize, and rotate, with multi-select (shift-click and drag-select)
- Undo / redo, including multi-shape actions (keyboard shortcuts and toolbar buttons)
- Layer ordering: bring to front, send to back, forward, backward
- Smart alignment guides with snapping while dragging
- Color picker with fill, stroke, and brush size
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
- Owner can change roles, remove members, and restore snapshots

## 🗺️ Roadmap

### Done ✅

- **Canvas basics:** Pan/zoom, shapes, selection and transforms, undo/redo (shortcuts and toolbar buttons)
- **Multiplayer:** Shared boards, live cursors, real-time sync, presence
- **Collaboration:** Sharing, permissions, snapshots / version history
- **Advanced tools:** Pen, text, layers, alignment guides
- **Polish:** Keyboard shortcuts, PNG export, dark mode, zoom-to-fit, coordinate HUD
- **Performance improvements:** Viewport culling, layer separation, render isolation, and batched database writes. Before-and-after measurements are documented below.

### In progress 🚧

- **Further performance tuning:** Improving zoom performance on boards with large numbers of shapes.

### Planned 📋

- Group / ungroup shapes
- Real-time comments
- Replace browser alerts and prompts with modals
- Unit tests for layer, snapping, and culling logic

### Intentionally out of scope

- SVG and PDF export (PNG covers the use case)
- Brush-style eraser (Delete covers the use case)
- Right-click context menu (every action is already reachable elsewhere)

## 📈 Performance

Performance was measured using production builds, comparing the application before and after optimization.

### Test environment

- **CPU:** AMD Ryzen 5 5600G
- **RAM:** 32 GB
- **Browser:** Google Chrome 150.0.7871.114 (64-bit)
- **Build:** Production (`npm run build` followed by `npm run start`)
- **Measurement:** Chrome DevTools → Rendering → Frame Rendering Stats
- **Test data:** A random mix of rectangles, circles, lines, arrows, and freehand strokes (82 points each), spread over ±4,000 world units.

The same machine, browser, viewport, shape counts, and interaction scenarios were used for both measurements. Each cell represents a single measurement, so results are approximate and may vary between runs.

### Before vs. after optimization

| Scenario (FPS) | Shapes | Before | After | Improvement |
|---|---:|---:|---:|---:|
| Zoom with mouse wheel | 0 | 50 | 49 | -2% |
| Zoom with mouse wheel | 1,000 | 25 | 38 | +52% |
| Zoom with mouse wheel | 2,000 | 17 | 28 | +65% |
| Pan | 0 | 49 | 50 | +2% |
| Pan | 1,000 | 40 | 47 | +18% |
| Pan | 2,000 | 36 | 50 | +39% |
| Drag one shape | 0 | 58 | 58 | 0% |
| Drag one shape | 1,000 | 48 | 58 | +21% |
| Drag one shape | 2,000 | 28 | 58 | +107% |

### What was optimized and why

The canvas rendering and interaction logic were optimized to reduce performance degradation as the number of shapes increases.

The work included:

- **Viewport culling:** Avoid rendering shapes outside the visible canvas area.
- **Layer separation:** Separate rendering responsibilities to reduce unnecessary redraws.
- **Render isolation:** Reduce unnecessary component re-renders during canvas interactions.
- **Batched database writes:** Group changes before persisting them to reduce database write frequency.

The results show the greatest improvements under heavier workloads:

- Zooming with 2,000 shapes improved from 17 to 28 FPS (+65%).
- Panning with 2,000 shapes improved from 36 to 50 FPS (+39%).
- Dragging one shape with 2,000 shapes improved from 28 to 58 FPS (+107%).

Zooming remains the main area for further performance improvements.

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
- Zoom performance still degrades on large boards, although optimization has significantly improved it. See the Performance section.

## 🛠️ Getting Started

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (the project uses [Neon](https://neon.tech))
- A [Clerk](https://clerk.com) application
- A [PartyKit](https://partykit.io) project (or the local dev server)

### 1. Clone and install

```bash
git clone https://github.com/vfreis09/Inkspace.git
cd Inkspace
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
# Database (use Neon's pooled connection string; the host contains "-pooler")
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# PartyKit
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
PARTYKIT_HOST=http://localhost:1999
PARTYKIT_SECRET=

# App URL (used by the PartyKit server to call the API)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Variable names are taken from the code. Check the Clerk dashboard for the exact key names your version expects.

Do not commit your `.env` file or expose secret keys. Use the corresponding environment variables in your deployment provider.

### 3. Database setup

Run the Prisma migrations:

```bash
npx prisma migrate dev
```

### 4. Run in development

Start both servers in separate terminals:

```bash
# Terminal 1: Next.js app
npm run dev
```

```bash
# Terminal 2: PartyKit real-time server
npx partykit dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run a production build locally

To test the optimized production build:

```bash
npm run build
npm run start
```

The Next.js app will be available at [http://localhost:3000](http://localhost:3000). Start the PartyKit server separately if you want to test real-time collaboration locally.

### Optional: Stress-test tool (development only)

To load many shapes locally for performance testing, add this to `.env`:

```env
NEXT_PUBLIC_ENABLE_STRESS=true
```

Then run `stress(1000)` in the browser console on a board, and `stressClear()` to remove them. Shapes are local only and are never saved or broadcast.

Do not set this variable in production.

## 📝 License

MIT

## 🤝 Contributing

This is a portfolio project, but feedback and suggestions are welcome!

---

**Built by Vicente Fernandes** | [Portfolio](https://vfreis09.github.io/) | [LinkedIn](https://www.linkedin.com/in/vicente-fernandes-339005155/)
