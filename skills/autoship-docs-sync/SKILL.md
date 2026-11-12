---
name: autoship-docs-sync
description: Synchronize project documents after confirmed decisions, plan changes, task delivery, repairs or verification changes in an Autoship workflow.
---

Read the confirmed decisions, relevant diff, evidence and runner's current status. Locate the affected authoritative documents using the project's existing index.

Update only what changed: requirements, design, app_flow, technical choices, task plans or progress. Reuse existing structure and references. Distinguish planned, implemented, verified and pending work; rolled-back decisions remain failure evidence rather than current behavior.

Check related references, task IDs and contradictory statements. Return the changed document paths and remaining inconsistencies, or report that no update was needed.

Return deferred as the complete list of conditions that remain unverified. Remove a prior item only when evidence shows it has been resolved; do not carry forward a reviewer's inability to rerun a check that the implementer already verified.

Read runtime state as evidence; leave counters, checkpoints and scheduling to the runner. Keep this operation to documents, preserve confirmed scope and do not initiate another code review. This skill can run within the current session.
