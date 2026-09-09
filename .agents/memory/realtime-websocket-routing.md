---
name: Realtime websocket routing
description: Preview proxy routing requirements for WebSocket-backed artifact services.
---

WebSocket endpoints must be explicitly listed in the owning artifact service's `paths` array alongside its REST path; listing only the REST prefix can leave the browser connection silently unforwarded through the preview proxy.

**Why:** The preview proxy forwards only declared service paths, and WebSocket upgrades are not reliably covered by a nearby REST path declaration.

**How to apply:** When adding a WebSocket endpoint, update the API artifact routing metadata through the validated artifact TOML flow before debugging client connection behavior.