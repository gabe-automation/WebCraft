# WebCraft

A real-time Wix-style visual page builder with movable HTML-like blocks, selective DOM-node locking, and a whole-document HTML/CSS/JS code view.

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

- `artifacts/conflict-free-editor/src/pages/editor.tsx` — the authenticated WebCraft shell, responsive visual builder, dedicated chat/whiteboard workspaces, live presence layer, and complete website source view
- `artifacts/conflict-free-editor/src/index.css` — app theme and interaction animations
- `artifacts/conflict-free-editor/src/App.tsx` — route and app shell entry point
- `artifacts/api-server/src/collab.ts` — in-memory CRDT-backed page state and native WebSocket collaboration protocol
- `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` — production Clerk frontend API proxy

## Architecture decisions

- Clerk manages real user accounts and the default Google/email sign-in flow; the browser uses Clerk session cookies and sends the signed-in profile into the realtime presence room.
- Locks are modeled as per-node edit leases; blocked writes are recorded in the activity stream rather than silently discarded.
- The server stores page properties as deterministic Lamport LWW-register CRDT fields, then applies node leases as the conflict-aware coordination layer.
- The code inspector generates the complete authored website as `index.html`, `styles.css`, and `script.js` from the shared node tree; editor internals are not included.
- Cursor coordinates are ephemeral WebSocket presence messages and are rendered as labeled collaborator pointers over the page frame.
- Chat messages and whiteboard marks use bounded realtime WebSocket broadcasts and are rehydrated from the room snapshot; they remain separate from authored website DOM state.
- Builder, Whiteboard, and Chat are separate authenticated routes (`/editor`, `/whiteboard`, `/chat`) with shared workspace navigation.
- Responsive geometry is stored per breakpoint in the same CRDT register model, while theme controls affect the generated website export without changing editor chrome.
- Builder measurement guides snap to page bounds, sibling edges, centers, and spacing anchors without rebuilding the React tree during pointer movement.

## Product

- Select and inspect DOM-like page nodes.
- Add new editable nodes and change their labels/content.
- Sign in with real Google/email users and see account-backed collaborator presence.
- Acquire/release node locks and observe blocked lock attempts.
- Run a deterministic concurrent-edit simulation and inspect the resulting event log.
- Drag blocks around the page canvas and see position changes shared across connected tabs.
- See other users' live cursors and movement over the page frame.
- Inspect and copy the full generated website HTML, CSS, or JavaScript document.
- Insert navigation, hero, image, cards, pricing, testimonial, auth, dashboard, chat, footer, and divider components with responsive desktop/tablet/mobile geometry.
- Collaborate in a realtime room chat and shared whiteboard with sticky, text, rectangle, line, and freehand tools.
- The generated `script.js` includes authored-node selection, action feedback, form submission messaging, and chat message behavior; generated HTML/CSS retain the committed breakpoint geometry and theme.
- Toggle measurement guides and adjust authored export colors through the theme direction controls.

## User preferences

_None recorded._

## Gotchas

- The collaboration server still stores the active room in memory; restarting the API server resets the shared page. Durable projects and automatic abandoned-lease expiry are not implemented yet.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
