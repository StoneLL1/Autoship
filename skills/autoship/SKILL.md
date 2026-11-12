---
name: autoship
description: Carry a new project or feature from confirmed requirements to local delivery, using the current agent's tools to create sessions and hand off work when needed. Resume an existing Autoship handoff.
---

Read the project's AGENTS.md, current progress and any supplied handoff. Adopt already confirmed requirements and existing authorization. Clarify only unresolved product decisions; after confirmation, keep working without asking for routine permission to continue.

Use [sessions](references/sessions.md) when starting or resuming the workflow and before handing off. Discover the host's actual capabilities, keep a durable handoff outside the task worktree, and use available, authorized tools to create and start a successor when a fresh context helps. Continue in the current session while it remains useful. Autoship supplies instructions, not a runtime; do not build a scheduler or background loop to execute them.

Load only the current stage:

- New idea: [clarify](stages/clarify.md), then [new-project route](stages/plan-new.md).
- Existing project feature: [clarify](stages/clarify.md), then [feature route](stages/plan-feature.md).
- Ready work: [implement](stages/implement.md), including verification and the task's one independent review.
- Existing findings: [repair](stages/repair.md).
- Assigned independent review: [code review](stages/review-code.md) or [planning review](stages/review-plan.md); stay within that role.
- Delivery: [finish](stages/finish.md).
- Obstacles and deferred checks: [recover](stages/recover.md), [verify](stages/verify.md).

Choose the fewest useful tasks for the difficulty and uncertainty; small projects may need only one or two. Related tasks and planning phases can share a session. Preserve each task's identity, acceptance, review and recovery history across session changes or replanning.

Within confirmed scope, choose implementation details and adjust the plan autonomously. Synchronize changed decisions and results with [autoship-docs-sync](../autoship-docs-sync/SKILL.md), in the current session when convenient.

Investigate obstacles, try authorized recovery or alternatives, and continue independent work. Record actual defects separately from unavailable verification. Take new product tradeoffs to the user without reopening settled decisions.

Stop when the confirmed scope is delivered with evidence, the user asks to stop, or no authorized work can proceed. Leave the exact next action and any needed user input when unfinished. Deliver locally; push or publish only when explicitly requested.
