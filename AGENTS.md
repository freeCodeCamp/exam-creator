# Exam Creator Project

AI agent and contributor guide for the Exam Creator full-stack application.

## Overview

Exam Creator is a Rust (Axum) + React (Vite + TypeScript) application for creating, generating, moderating, and attempting exams with multiple choice and dialogue question sets. MongoDB backend with Prisma schema typing and WebSocket support for real-time collaboration.

**Key Features:**

- Exam configuration with question sets, tag quotas, timing, and passing criteria
- Exam generation from question pools with user attempt tracking
- GitHub OAuth (or mock auth in debug) with session management
- Real-time collaboration via WebSockets (exam state sync, user presence)
- Moderation workflow with approval/denial/feedback

## Repository Structure

```
client/          React + TypeScript SPA (Vite, Chakra UI)
server/          Rust Axum backend
  ├── main.rs    Entry point
  ├── app.rs     Router, CORS, sessions, OAuth setup
  ├── config.rs  Environment variables
  ├── routes/    HTTP handlers (exams, attempts, moderations, users, auth, websocket)
  ├── extractor/ WebSocket handlers & auth extractor
  ├── database/  DB helpers, Prisma bridging
  ├── state.rs   Shared in-memory state (ClientSync)
  └── errors.rs  Unified error handling
prisma/          Schema & JS client generation
public/          Static assets
index.html       Frontend entry
Dockerfile       Multi-stage build (bun + cargo chef + distroless)
sample.env       Environment variable template
```

**Tech Stack:**

- Frontend: React 19, TanStack Router, React Query, Chakra UI, Immer
- Backend: Axum, tower-sessions, MongoDB driver, oauth2
- Build: Vite, Bun, cargo-chef

## Development Commands

**Frontend:**

- `bun install` or `npm install` - Install dependencies
- `bun run dev` - Start Vite dev server (port 5173)
- `bun run build` - Type-check + production build
- `bun run preview` - Preview production build

**Backend:**

- `cargo run` - Run server (requires env vars, uses `docker` feature by default)
- `cargo build --release` - Production build
- `cargo fmt` - Format code
- `cargo clippy` - Lint

**Prisma:**

- `npx prisma generate` - Generate client (auto-run in Docker)

**Local Dev Workflow:**

1. Start MongoDB (local or Atlas)
2. Set environment variables (see sample.env)
3. Terminal A: `cargo run` (server)
4. Terminal B: `bun run dev` (frontend)

## Environment Variables

**Required:**

- `COOKIE_KEY` - 64-byte session key
- `MONGODB_URI_PRODUCTION` - MongoDB connection string
- `MONGODB_URI_STAGING` - MongoDB connection string

**Conditionally Required (unless `MOCK_AUTH=true` in debug):**

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

**Optional (with defaults):**

- `PORT` (8080) - Server port
- `ALLOWED_ORIGINS` (`http://127.0.0.1:{PORT}`) - CORS origins (CSV)
- `GITHUB_REDIRECT_URL` (`http://127.0.0.1:{PORT}/auth/callback/github`)
- `MOCK_AUTH` (false) - Bypass OAuth (debug only)
- `REQUEST_BODY_SIZE_LIMIT` (5 \* 2^20 bytes) - ~5 MiB
- `REQUEST_TIMEOUT_IN_MS` (5000)
- `SESSION_TTL_IN_S` (7200)

**Update `sample.env` when adding/modifying env vars.**

## Architecture

**Backend:**

- Axum with tower-sessions (MemoryStore - not production-ready for multi-node)
- MongoDB via official driver + custom domain models
- Tracing for structured logging
- CORS via `ALLOWED_ORIGINS`
- GitHub OAuth via oauth2 crate
- WebSocket state in `Arc<Mutex<ClientSync>>` with 5-min cleanup task
- Static file serving: Built frontend (`dist/`) served by Rust server

**WebSockets:**

- `/ws/exam/{exam_id}` - Collaborative exam editing (not fully implemented)
- `/ws/users` - User presence tracking

**Data Model:**

- Prisma schema for JS types
- Rust uses custom domain models
- `construct_attempt` in `config.rs` enriches attempts with submission times and selected answers

## Code Style

**TypeScript:**

- Strict mode enabled (`tsconfig.json`)
- PascalCase for components, camelCase for variables/functions
- Avoid `any`, prefer explicit types
- Functional components, hooks for side effects
- React Query for server data
- Immer for immutable state updates
- Keep components < 200 LOC

**Rust:**

- Use `?` for error propagation via `errors.rs`
- Thin route handlers, delegate logic to modules
- Async-only (no blocking I/O)
- Run `cargo fmt` and `cargo clippy`

**General:**

- Document "why" not "what" in comments
- Match existing code style
- Check dependencies before use (package.json/Cargo.toml)
- Group imports: external, internal, assets

## API Endpoints

**Exams:**

- `GET /api/exams` - List exams
- `POST /api/exams` - Create exam
- `GET /api/exams/{exam_id}` - Get exam
- `PUT /api/exams/{exam_id}` - Update exam
- `PUT /api/exams/{exam_id}/seed/staging` - Seed to staging
- `PUT /api/exams/{exam_id}/seed/production` - Seed to production

**Attempts:**

- `GET /api/attempts` - List attempts
- `GET /api/attempts/{attempt_id}` - Get attempt
- `PATCH /api/attempts/{attempt_id}/moderation` - Update moderation status

**Exam Challenges:**

- `GET /api/exam-challenges/{exam_id}` - Get challenges
- `PUT /api/exam-challenges/{exam_id}` - Update challenges

**Users:**

- `GET /api/users` - List users (auth required)
- `GET /api/users/session` - Current session user
- `PUT /api/users/session/settings` - Update user settings

**State:**

- `PUT /api/state/exams/{exam_id}` - Discard exam state

**Auth:**

- `GET /auth/login/github` - Initiate OAuth
- `GET /auth/github` - OAuth callback
- `DELETE /auth/logout` - Logout

**Health:**

- `GET /status/ping` - Health check

**WebSockets:**

- `/ws/exam/{exam_id}` - Collaborative exam editing (not fully implemented)
- `/ws/users` - User presence tracking

## Security

- Never commit secrets (use `.gitignore` for `.env`)
- `COOKIE_KEY` must be exactly 64 bytes
- Enforce `ALLOWED_ORIGINS` (no wildcard credentials)
- GitHub OAuth redirect must match app config
- Validate user input server-side
- Replace MemoryStore for production (use Redis/DB-backed store)
- Rate limiting not implemented (consider tower-governor)

## Performance

- Offload CPU-heavy tasks to `tokio::task::spawn_blocking`
- Add MongoDB indexes for frequently queried fields
- MemoryStore has O(n) memory growth - migrate early
- Monitor frontend bundle size, code-split routes if needed

## Adding Features

1. Update `prisma/schema.prisma` if data model changes, run `npx prisma generate`
2. Add/update Rust route handler in `server/routes/`, register in `app.rs`
3. Extend frontend types (`client/types/`) and queries (`client/utils/fetch.ts`)
4. Implement React components
5. Run `cargo clippy`, `cargo fmt`, and `tsc` to verify
6. Update `sample.env` if new env vars added
7. Update this file and `CHANGELOG.md`

## Open Items

- Add automated tests (frontend + backend) and CI
- Replace MemoryStore with Redis for production
- Implement rate limiting and stronger WebSocket auth
- Add E2E exam generation tests
- Schema versioning/migration strategy

## Agent Expectations

- Respect env var constraints (COOKIE_KEY length, required secrets)
- Run `tsc` before shipping code changes
- Avoid `any` or `unsafe` without justification
- No sweeping refactors
- Update this file when changing architecture, env vars, or major modules
- Update `CHANGELOG.md` with planning and implementation notes
