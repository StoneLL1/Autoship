---
name: autoship-docs-sync
description: Synchronize project documents after confirmed decisions, plan changes, task delivery, repairs or verification changes in an Autoship workflow.
---

Read confirmed decisions, relevant diff, verification evidence and the current handoff. Locate affected authoritative documents using the project's existing index.

Update only what changed: requirements, design, app_flow, technical choices, task plans or progress. Reuse existing structure and references. Distinguish planned, implemented, verified and pending work; rolled-back decisions remain failure evidence rather than current behavior.

Check related references, task IDs and contradictory statements. Return changed document paths and remaining inconsistencies, or report that no update was needed.

Keep a complete list of conditions that remain unverified, with their reasons and next checks. Remove a prior item only when evidence shows it has been resolved; do not carry forward a reviewer's inability to rerun a check that the implementer already verified.

Reflect established results without rewriting execution history: retain task identities, consumed budgets, dispatched reviews and their evidence. The coordinating agent updates these facts after checking actual tools and files; document synchronization must not reset them or invent completion. Keep this operation to documents, preserve confirmed scope and do not initiate another code review. This skill can run within the current session.
