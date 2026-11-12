---
name: autoship
description: Guide a new project or feature through clarification, planning and automatic task handoffs using the project's existing coding agent.
---

Read the project's AGENTS.md and current progress. Locate the current phase; load only its instructions below.

Scale the workflow to the work. Choose task count from difficulty and uncertainty; a small project may need only one or two tasks. Decide session grouping separately: related tasks or planning phases can share a session while context remains useful. Keep each task's acceptance, one review and recovery record distinct. These are logical phases, not mandatory new sessions.

- New idea: [clarify](stages/clarify.md), then [new-project route](stages/plan-new.md).
- Existing project feature: [clarify](stages/clarify.md), then [feature route](stages/plan-feature.md).
- Assigned work: [implement](stages/implement.md), [review](stages/review-code.md), or [repair](stages/repair.md), as requested by the runner.
- Delivery: [finish](stages/finish.md).
- Obstacles and deferred checks: [recover](stages/recover.md), [verify](stages/verify.md).

Confirm product scope with the user before automatic execution. Within that scope, choose implementation details and adjust plans autonomously; synchronize affected documents with [autoship-docs-sync](../autoship-docs-sync/SKILL.md).

Each task has one independent reviewer. The implementer fixes and verifies its findings; do not dispatch another review. The runner owns retries, checkpoints, commits and task transitions.

Investigate obstacles, try authorized recovery or alternatives, and continue independent work. Record unverifiable results honestly. Preserve requests that require a user decision without repeatedly asking settled questions.

Leave decisions, document locations, evidence and the next action for the next session. When using the runner, follow [the local execution protocol](../../docs/runtime.md).
