# Exam Creator Project (AGENT.md)

This file provides unified, tool-agnostic guidance for AI coding agents and new contributors. It summarizes project purpose, structure, conventions, commands, architecture, testing, security, and operational considerations.

## Project Overview

Exam Creator is a full‑stack application for configuring, generating, moderating, and attempting exams comprised of question sets (multiple choice and dialogue groupings). It exposes a Rust (Axum) HTTP + WebSocket API backed by MongoDB and serves a bundled React (Vite + TypeScript + Chakra UI) frontend. Prisma (MongoDB connector) is used for schema typing / client generation (JS side) while Rust uses the official `mongodb` driver and custom domain models.

Key capabilities:

- Create/update exams with configurable question sets, tag quotas, timing, and passing criteria.
- Generate exam variations from pools (EnvGeneratedExam) and track user attempts (EnvExamAttempt).
- GitHub OAuth login (or mock auth in debug) with session management (tower-sessions, cookie key).
- Real‑time collaboration & presence (WebSockets for users and exam state syncing; see `server/extractor/ws_handler_*`).
- Moderation workflow for exam attempts with status + feedback.

## Repository Structure

Top-level directories/files:

- `client/` React + TypeScript SPA (Vite) and UI components.
- `server/` Rust Axum backend (entry: `server/main.rs`, app builder: `server/app.rs`).
- `prisma/` Prisma schema (`schema.prisma`) & JS generation (used by frontend tooling / types).
- `public/` Static assets copied into build.
- `index.html` Frontend HTML entry (Vite).
- `Dockerfile` Multi-stage build: bun + prisma generate + cargo chef + distroless runtime.
- `sample.env` (if present) / environment variable sample (update when env changes).
- `AGENT.md` (this file) universal agent configuration.

Important server modules:

- `config.rs` Environment variable ingestion & defaults (see Env Vars section).
- `app.rs` Router construction (routes, CORS, sessions, tracing, static file serving, OAuth setup).
- `routes/` HTTP route handlers (exams, attempts, moderations, users, auth, websocket endpoints in `websocket.rs`).
- `extractor/` WebSocket handler logic.
- `database/` DB related helpers (Prisma bridging / sessions / domain wrappers).
- `state.rs` Shared state (in‑memory client sync & cleanup task).
- `errors.rs` Unified error type -> HTTP responses.

Client highlights:

- React 19 + Router (TanStack), React Query for data fetching, Chakra UI for styling, Immer for immutable state helpers.
- Custom context providers: auth, websocket users, exam collaboration hook (`use-collab-exam.ts`).

## Build & Development Commands

Node tooling uses Bun for install in Docker, but locally you can use `bun` or `npm`/`pnpm` (lockfile is Bun). Recommended: Bun >= 1.1 or Node 20+.

Scripts (package.json):

- `dev`: Start Vite dev server (defaults to port 5173 unless overridden).
- `develop:server`: Run Rust server in debug (`cargo run`).
- `build`: Type-check (`tsc`) then build production assets with Vite.
- `preview`: Serve built frontend for local preview.

Rust:

- `cargo run` (optionally with `--features docker` if relying on that entry gating; main currently under `#[cfg(feature = "docker")]`). For local iterative dev you may remove that cfg or enable feature. If feature gating is unintended, consider removing attribute to allow plain `cargo run`.
- `cargo build --release` for production binary.

Prisma:

- `npx prisma generate` (automatically run inside Docker build). Ensure MongoDB connection env var(s) available (see Env Vars).

Docker build:

1. Builds frontend via Bun.
2. Generates Prisma client.
3. Uses cargo-chef to layer dependencies.
4. Copies frontend `dist` into runtime image alongside Rust binary (`/server`).

Example local dev workflow:

1. Start MongoDB (Atlas cluster or local). Ensure `MONGODB_URI` & `MONGOHQ_URL` (Prisma) env vars.
2. `bun install` (or `npm i`).
3. Terminal A: `cargo run` (server) (set env vars).
4. Terminal B: `bun run dev` (frontend hot reload).

## Environment Variables (from `server/config.rs`)

Required (panic if missing):

- `COOKIE_KEY` (64 bytes) – session encryption/signing key.
- `MONGODB_URI` – MongoDB connection string (Rust driver).
- `MONGOHQ_URL` – Prisma datasource URI (MongoDB) for JS client generation.

Conditionally required (must exist unless `MOCK_AUTH=true` in debug):

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Optional with defaults:

- `PORT` (default 8080) – server bind port.
- `ALLOWED_ORIGINS` (CSV) (default `http://127.0.0.1:{PORT}`) – CORS.
- `GITHUB_REDIRECT_URL` (default `http://127.0.0.1:{PORT}/auth/callback/github`).
- `MOCK_AUTH` (`true|false`, default false) – bypass OAuth for dev (only allowed in debug).
- `REQUEST_BODY_SIZE_LIMIT` (default 5 \* 2^20 bytes ≈ 5 MiB).
- `REQUEST_TIMEOUT_IN_MS` (default 5000).
- `SESSION_TTL_IN_S` (default 7200).

Update `sample.env` (or add one) when modifying env vars. Regenerate documentation sections here accordingly.

## Runtime & Operations

Server stack:

- Axum (HTTP routing, extractors, websockets via upgrade handlers).
- tower-sessions with in-memory store (MemoryStore) – not suitable for multi-node production; replace with Redis or database-backed store for scaling.
- Tracing (`tracing` & `tower_http::trace::TraceLayer`) logs request spans with latency.
- CORS configured via `ALLOWED_ORIGINS` + credentials true.
- GitHub OAuth (oauth2 crate) – ensure redirect URL matches GitHub app config.
- Graceful shutdown on SIGINT/SIGTERM.

Static file serving: Built frontend (`dist/`) is served by the Rust server, with SPA routes mapped to `index.html` for client-side navigation.

WebSockets:

- `/ws/exam/{exam_id}` for collaborative exam editing/state.
- `/ws/users` for presence / online users tracking.
- Shared state: `ClientSync` (lists of users, exams) stored in `Arc<Mutex<...>>`; periodic cleanup task every 5 minutes.

## Data Model (Prisma / Domain)

Primary domain entities (subset):

- `EnvExam` – canonical exam definition (question sets, config, prerequisites, deprecated flag).
- `EnvGeneratedExam` – snapshot/generation for exam variant served to user.
- `EnvExamAttempt` – user's attempt referencing generated exam & exam id, with per-question answers and submission times.
- `EnvQuestionSet` / `EnvMultipleChoiceQuestion` / `EnvAnswer` – structural building blocks.
- Moderation: `ExamEnvironmentExamModeration` with status (Approved|Denied|Pending) + feedback & timestamps.
- User: `user` (extensive profile fields + relations to attempts/tokens).

Rust constructs composite Attempt DTO in `config.rs` (`construct_attempt`) filtering & enriching attempt responses with submission time and selected answers.

## Code Style & Conventions

General:

- TypeScript strict (see `tsconfig.json` – ensure maintain strict flags; add if missing: `strict: true`).
- Prefer functional, pure components; keep side effects in hooks or query callbacks.
- Naming: PascalCase for React components, camelCase for variables/functions. Acronyms uppercase (ID, URL, API).
- Avoid broad `any`; prefer explicit generics or type inference.
- No silent suppression of errors (`// @ts-ignore` discouraged). Add runtime guards if needed.
- Keep React components small (< ~200 LOC) and extract logic hooks where complex logic emerges.
- Use React Query for server data; centralize fetch logic in `client/utils/fetch.ts` (auth headers, error translation).
- Use Immer (or `use-immer`) for complex immutable updates rather than deep cloning.

Imports:

- Group: external libs, internal absolute/relative, styles/assets.
- Prefer explicit file endings for local imports when ambiguity arises.

Rust:

- Use explicit error propagation (`?`) and unify error conversion through `errors.rs`.
- Keep route handlers thin: delegate heavy logic to dedicated modules or helper functions.
- Avoid blocking calls (always use async driver features). No synchronous file or network I/O on request path.
- Enforce `clippy` (add CI step recommended) and `rustfmt` default style.

JSON / API:

- Consistent snake_case for JSON keys (Prisma side) unless existing clients demand otherwise.
- Document new endpoints in this file (API section) and update frontend types (`client/types/`).

## API Surface (High-Level)

HTTP Endpoints (selected):

- `GET /api/exams` – list exams.
- `POST /api/exams` – create exam.
- `GET /api/exams/{exam_id}` – exam by id.
- `PUT /api/exams/{exam_id}` – update exam.
- `GET /api/attempts` – list attempts.
- `GET /api/attempts/{attempt_id}` – attempt by id.
- `GET /api/moderations` – list moderation queue/items.
- `GET /api/users` – list users (requires auth).
- `GET /api/users/session` – current session user.
- `PUT /api/state/exams/{exam_id}` – discard exam state.
- Auth: `GET /auth/login/github`, `GET /auth/github` (callback), `DELETE /auth/logout`.
- Health: `GET /status/ping`.
- WebSockets: `/ws/exam/{exam_id}`, `/ws/users`.

Add new routes under `server/routes/` and mount in `app.rs`; ensure CORS & auth (if needed) handled.

## Security Considerations

- Never commit real secrets. Use `.gitignore` for `.env`.
- `COOKIE_KEY` must be exactly 64 bytes (validated) — rotate if compromised.
- Enforce origin allowlist via `ALLOWED_ORIGINS`; avoid wildcard credentials.
- GitHub OAuth redirect URL must match configured application; disallow open redirects.
- HTTP client (`reqwest`) is configured with redirects disabled to mitigate SSRF risk.
- Validate user input lengths and expected formats server-side (add explicit validation layer for new endpoints).
- Replace in-memory session store for production deployments with a persistent store to avoid horizontal scaling issues & session loss on restart.
- Rate limiting: Not currently implemented; consider `tower-governor` or custom middleware for brute force / abuse protection.
- WebSocket: Authenticate/authorize participants (currently depends on session + client sync; tighten as needed for exam integrity).

## Performance & Scaling

- Axum is async; ensure heavy CPU tasks (e.g. bulk generation) are offloaded to blocking thread pools (`tokio::task::spawn_blocking`).
- MongoDB queries: Add indexes for frequently queried fields (e.g., examAttemptId, userId) (some defined in schema). Review query plans if latency grows.
- Session MemoryStore leads to O(n) memory with active sessions — plan migration early.
- Frontend bundles: Monitor Vite output size; code split routes if needed.

## Logging & Observability

- Structured logs via tracing; by default, environment filter uses crate name = debug. Override with `RUST_LOG=server=info` etc.
- Include matched path in trace spans for route correlation.
- Add metrics (future): integrate `metrics` crate + Prometheus exporter as needed.

## Adding a New Feature (Playbook)

1. Define API / data model changes; update `prisma/schema.prisma` if necessary (add new types/fields) and run `npx prisma generate`.
2. Add/update Rust route handler in `server/routes/` and register in `app.rs`.
3. Extend frontend types (`client/types/`) & queries (`client/utils/fetch.ts`).
4. Implement React components & state hooks.
5. Add tests (unit & integration) and doc updates (README + this file sections as needed).
6. Verify `cargo clippy` & `cargo fmt` (add CI) and TS type checks (`tsc`).
7. Update `sample.env` if new env vars introduced.

## Configuration Management

When adding configuration:

1. Add env var with sane default (if not sensitive) in `config.rs`.
2. Document here (Env Vars section) + `sample.env`.
3. Ensure frontend consumption (if required) via build-time injection or dedicated endpoint (avoid leaking secrets).
4. Consider validation (length, format) when reading var.

## Open Improvement Items

- Add automated test suites (frontend + backend) & CI pipeline.
- Replace in-memory sessions with Redis-backed store for production.
- Implement rate limiting & stronger auth checks for WebSockets.
- Add E2E exam generation correctness tests.
- Consider splitting domain logic from route layer for better testability.
- Add schema versioning or migration strategy for evolving exam structures.

## Tooling Expectations for Agents

Agents interacting with this repo SHOULD:

- Respect environment variable constraints (`COOKIE_KEY` length, required secrets).
- Run TS build (`tsc`) before shipping code changes to catch type regressions.
- Avoid introducing `any` or `unsafe` patterns without justification.
- Update this file when altering architecture, env vars, primary scripts, or adding significant modules.
- Update the `CHANGELOG.md` file as necessary.

---

End of AGENT.md.
