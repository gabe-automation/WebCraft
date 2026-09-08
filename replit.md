# Conflict-Free Page Editor

A local interactive sandbox for testing selective DOM-node locking, concurrent edits, and deterministic conflict resolution.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/conflict-free-editor/src/pages/editor.tsx` — the complete local-state editor experience
- `artifacts/conflict-free-editor/src/index.css` — app theme and interaction animations
- `artifacts/conflict-free-editor/src/App.tsx` — route and app shell entry point

## Architecture decisions

- The first version is intentionally frontend-only and uses local React state so conflict behavior can be tested without auth, a database, or a realtime service.
- Locks are modeled as per-node edit leases; blocked writes are recorded in the activity stream rather than silently discarded.
- The simulator makes the resolution rule visible: the active lease wins and the competing edit is deferred.

## Product

- Select and inspect DOM-like page nodes.
- Add new editable nodes and change their labels/content.
- Switch between two simulated collaborators.
- Acquire/release node locks and observe blocked lock attempts.
- Run a deterministic concurrent-edit simulation and inspect the resulting event log.

## User preferences

_None recorded._

## Gotchas

- This build is a testing sandbox, not a real multi-user collaboration backend; refresh resets the local session state.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
