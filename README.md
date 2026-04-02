# Inkspace

> Real-time collaborative whiteboard for infinite creativity

A production-grade collaborative canvas application where multiple users can draw, design, and brainstorm together in real-time. Built to showcase modern web development skills and distributed systems architecture.

## 🎯 What It Is

Inkspace is a web-based infinite canvas tool built from the ground up to handle complex real-time interactions. Unlike wrapper-based solutions, Inkspace implements its own rendering logic to ensure maximum control over the user experience.

- Custom Drawing Engine: Built on HTML5 Canvas for high-performance rendering.
- Multiplayer Sync: Real-time collaboration with conflict-free data synchronization.
- Presence: Live cursors and user activity indicators.
- Infinite Canvas: Advanced panning and zooming capabilities.
- State Management: Robust undo/redo and shape serialization.

## 🚀 Tech Stack

### Frontend

- **Next.js 16** (App Router) - React framework with SSR and API routes
- **TypeScript** - Type-safe development
- **Konva.js** - 2D Canvas framework used to build the custom rendering engine.
- **Zustand** - Lightweight state management
- **TailwindCSS** - Utility-first styling
- **Shadcn/ui** - Accessible component library

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database (Vercel Postgres / Supabase)

### Real-Time

- **Partykit** - WebSocket infrastructure for real-time collaboration

### Auth

- **Clerk** - Authentication and user management

### Storage

- **Vercel Blob** / **Cloudflare R2** - File storage for exports and snapshots

### Deployment

- **Vercel** - Frontend and API hosting
- **Partykit** - Real-time server hosting

## 🏗️ Project Architecture

Inkspace uses a Layered Canvas Architecture to optimize performance:

- The Grid Layer: Constant reference for infinite panning.
- The Interaction Layer: Handles active selections and transformations.
- The Sync Layer: Manages Yjs updates and Partykit WebSocket broadcasts.

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

**Built by Vicente Fernandes** | [Portfolio](https://vfreis09.github.io/) | [LinkedIn](https://www.linkedin.com/in/vicente-fernandes-339005155/)
