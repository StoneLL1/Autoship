# Implement and deliver a task

Read AGENTS.md, the task spec, relevant documents and the active handoff. Check dependencies and actual workspace state, then establish the baseline only for a task that has not started; otherwise preserve its original baseline. Record the current implementation context once, reusing an existing session entry on resume, using [sessions](../references/sessions.md). Resume an interrupted attempt rather than restarting completed work.

Implement the promised behavior and run relevant checks. For frontend work, read design.md and app_flow.md and inspect actual rendering. Investigate obstacles and compatible alternatives; use [recovery](recover.md) for blocked work or exhausted attempts.

When the candidate is ready, inspect this task's review record. If never dispatched, record the dispatch intent and send [review-code](review-code.md), the spec, the complete task diff and evidence to one independent, read-only reviewer. Use the strongest configured available model where supported. Save the returned session or invocation ID and result. If already dispatched, retrieve or resume that same review; if completed, use its existing findings. Never dispatch a second review after fixes, rollback or a session change. If no independent reviewer can run, leave review pending and continue work that does not depend on accepting this task; self-review does not satisfy it.

Fix valid findings and verify affected behavior with [repair](repair.md), within the recorded budget. Associate the review with the version it actually inspected and verification with the final version. A successful tool exit or an agent's completion message alone is insufficient evidence.

Synchronize affected documents with [autoship-docs-sync](../../autoship-docs-sync/SKILL.md). Check the final diff and, where Git and project conventions allow, commit only this task's changes locally. If a hook changes files, verify the changed result before accepting it. Record the result, remaining verification and commit or file evidence in the handoff. Select the next ready task and continue, handing off only when useful; when none remain, use [finish](finish.md).
