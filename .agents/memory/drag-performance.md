---
name: Drag performance
description: Keep canvas dragging outside the React render loop and throttle shared geometry updates.
---

Canvas dragging should mutate the active element position directly during pointer movement, commit React node state on release, and throttle realtime geometry broadcasts.

**Why:** Rebuilding the full node tree also regenerates the website source and inspector state; doing that for every pointer event makes dragging visibly laggy.

**How to apply:** Use refs for the active drag element and position, send shared move operations at a bounded rate, and preserve unique realtime session IDs for multi-tab collaborators.