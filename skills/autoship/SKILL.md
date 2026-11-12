---
name: autoship
description: Use when asked to run Autoship for a new project, feature or bug fix, or to resume an Autoship handoff. Carry confirmed scope through planning, implementation, verification and local delivery with the host's available tools.
---

If assigned an independent review, load only [code review](stages/review-code.md) or [planning review](stages/review-plan.md) and the supplied review context. Stay read-only; the coordinator owns execution and the handoff.

Otherwise, read the project's AGENTS.md, relevant progress and any supplied handoff using [task context](references/context.md). Adopt already confirmed requirements and existing authorization. Clarify only unresolved product decisions; after confirmation, keep working without asking for routine permission to continue. Respond and write project-facing documents in the user's language unless the project has an established convention.

Use [sessions](references/sessions.md) when starting or resuming the workflow and before handing off. Discover the host's actual capabilities, keep a durable handoff outside the task worktree, and use available, authorized tools to create and start a successor when a fresh context helps. Continue in the current session while it remains useful. Autoship supplies instructions, not a runtime; do not build a scheduler or background loop to execute them.

Load only the current stage:

- New idea: [clarify](stages/clarify.md), then [new-project route](stages/plan-new.md).
- Existing project feature: [feature route](stages/plan-feature.md); investigate the current behavior before asking about changes.
- Bug report: [fix route](stages/plan-fix.md).
- Ready work: [implement](stages/implement.md), including verification and the task's one independent review.
- Existing findings: [repair](stages/repair.md).
- Delivery: [finish](stages/finish.md).
- Obstacles and deferred checks: [recover](stages/recover.md), [verify](stages/verify.md).

Choose the fewest useful tasks for the difficulty and uncertainty; small projects may need only one or two. A short plan can contain the brief, decisions and task specs together; retain explicit design and flow references for frontend work. Related tasks and planning phases can share a session. Preserve each task's identity, acceptance, review and recovery history across session changes or replanning.

Within confirmed scope, choose implementation details and adjust the plan autonomously. Synchronize changed decisions and results with [autoship-docs-sync](../autoship-docs-sync/SKILL.md), in the current session when convenient.

Investigate obstacles, try authorized recovery or alternatives, and continue independent work. Record actual defects separately from unavailable verification. Take new product tradeoffs to the user without reopening settled decisions.

Use [acceptance and evidence](references/quality.md) to decide when work is delivered. Stop when that condition holds for the confirmed scope, the user asks to stop, or no authorized work can proceed. Leave the exact next action and any needed user input when unfinished. Deliver locally; push or publish only when explicitly requested.
