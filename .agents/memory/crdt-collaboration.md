---
name: CRDT collaboration
description: Northstar's realtime page model uses deterministic per-property Lamport registers with leases and ephemeral cursor presence.
---

Northstar merges authored page properties with an operation-based, per-property Lamport LWW-register CRDT. Node leases remain a separate UX/protection layer, while cursor coordinates are ephemeral presence events.

**Why:** The editor needs concurrent writes to converge without treating the whole page snapshot as a last-writer-wins blob, but it also needs visible selective locking for the conflict-free-engine demo.

**How to apply:** Keep website-authored fields and geometry in the CRDT operation path; keep cursors/presence out of durable document state; do not mix editor chrome into the generated website source.