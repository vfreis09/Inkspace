# Inkspace

> Real-time collaborative whiteboard for infinite creativity

A production-grade collaborative canvas application where multiple users can draw, design, and brainstorm together in real-time. Built to showcase modern web development skills and distributed systems architecture.

## 🎯 What It Is

Inkspace is a web-based infinite canvas tool similar to Figma, Miro, or Excalidraw. Users can:

- Draw shapes, lines, and free-hand sketches
- Collaborate in real-time with multiple users
- See live cursors and presence indicators
- Share boards with view/edit permissions
- Export creations as PNG/SVG/PDF
- Comment and annotate on the canvas

## 🚀 Tech Stack

### Frontend

- **Next.js 14** (App Router) - React framework with SSR and API routes
- **TypeScript** - Type-safe development
- **Tldraw** - Open-source infinite canvas library (core rendering engine)
- **Zustand** - Lightweight state management
- **TailwindCSS** - Utility-first styling
- **Shadcn/ui** - Accessible component library

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database (Vercel Postgres / Supabase)

### Real-Time

- **Partykit** - WebSocket infrastructure for real-time collaboration
- **Yjs** (via Tldraw) - CRDT for conflict-free multiplayer sync

### Auth

- **Clerk** - Authentication and user management

### Storage

- **Vercel Blob** / **Cloudflare R2** - File storage for exports and snapshots

### Deployment

- **Vercel** - Frontend and API hosting
- **Partykit** - Real-time server hosting

## 🎯 Core Features

### Phase 1: Canvas Basics ✅

- Infinite canvas with pan/zoom
- Basic shapes (rectangle, circle, line, arrow)
- Selection, move, resize, rotate
- Undo/redo
- Delete shapes

### Phase 2: Real-Time Multiplayer 🚧

- Multiple users on same board
- Live cursors with user names
- Real-time shape synchronization
- Presence indicators

### Phase 3: Collaboration Features 📋

- Share board with link
- Permission management (view/edit)
- Real-time comments
- Board snapshots/version history

### Phase 4: Advanced Tools 📋

- Free-hand drawing (pen tool)
- Text tool
- Layers/z-index management
- Group/ungroup shapes
- Alignment guides

### Phase 5: Export & Polish 📋

- Export as PNG/SVG/PDF
- Keyboard shortcuts
- Dark mode
- Performance optimization

## 🎯 Goals

This project demonstrates:

- Real-time distributed systems architecture
- Complex state management in collaborative environments
- Performance optimization for canvas rendering
- Production-ready authentication and permissions
- Modern full-stack TypeScript development

## 📝 License

MIT

## 🤝 Contributing

This is a portfolio project, but feedback and suggestions are welcome!

---

**Built by [Your Name]** | [Portfolio](https://vfreis09.github.io/) | [LinkedIn](https://www.linkedin.com/in/vicente-fernandes-339005155/)
