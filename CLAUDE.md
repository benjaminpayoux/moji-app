# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moji is a movie guessing game where players identify movies from emoji representations. It's a monorepo with a Next.js frontend and a Node.js Socket.IO backend.

## Commands

### Frontend (from `frontend/` directory)
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
npm run lint     # Run ESLint
```

### Server (from `server/` directory)
```bash
npm run dev      # Start dev server with tsx (port 3001)
npm run build    # Compile TypeScript to dist/
npm run start    # Run compiled JS from dist/
```

## Architecture

### Communication
- Real-time Socket.IO communication between frontend and server
- Shared event types defined separately in both codebases (`frontend/src/types/socket.ts` and `server/src/socket/types.ts`)
- Events: `getMovie`, `checkAnswer`, `timeout` (client→server) and `movieData`, `answerResult`, `error` (server→client)

### Server (`server/src/`)
- `index.ts` - HTTP server with Socket.IO, CORS config via `ALLOWED_ORIGINS` env var
- `socket/` - Connection handling and game event handlers
- `game/movies.ts` - Movie database with emoji→answer mappings
- `game/validation.ts` - Answer checking with Levenshtein distance tolerance (20% error margin)

### Frontend (`frontend/src/`)
- Next.js 16 with App Router
- `app/page.tsx` - Entry point rendering the Game component
- `components/game.tsx` - Main game UI with timer logic (15 seconds per round)
- `hooks/useSocket.ts` - Socket.IO connection management
- `lib/socket.ts` - Socket singleton with reconnection config
- Uses shadcn/ui (new-york style) with Tailwind CSS 4

### Environment Variables
- Frontend: `NEXT_PUBLIC_SOCKET_URL` (default: http://localhost:3000)
- Server: `PORT` (default: 3001), `ALLOWED_ORIGINS` (comma-separated)
