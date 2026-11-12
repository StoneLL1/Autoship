# Recover the current work

Read the task, handoff and raw failure evidence. Check actual files, Git state and existing sessions before repeating an action. Use [sessions](../references/sessions.md) for ownership and interrupted creation; retain all prior task and review history.

## Diagnose and continue

For environment, login, quota, permission or process failures, investigate the installed tools and try recovery within existing authorization. Use only already configured and authorized alternatives. Record what was tried and the next recovery condition; retry when that condition changes, rather than repeating the same failure indefinitely. Continue independent work. If nothing can proceed, save the handoff and report the smallest needed user action or resume condition. A stopped host cannot wake itself through these instructions.

Keep an unavailable check pending with its reason; a reproduced defect is a defect and follows the repair budget. A product decision outside confirmed scope goes to the user without blocking unrelated work.

## Repair budget

Unless the user sets another limit, allow two repair rounds per implementation session and three implementation sessions per task, including the first. One repair round addresses a batch of failed delivery checks or review findings and verifies the fixes; ordinary edits and compile errors during initial implementation are not separate rounds. Record a round before starting it and its result afterward. Interrupted work resumes the same round.

Record each genuinely new implementation context before it begins work, even when changing agent or moving for context capacity. Resuming the same context does not consume a new session, nor do planning, read-only review or a launch that never began implementation. New contexts retain earlier session counts and repair records; a task rename or split inherits its originating task's remaining budget and review history. Only explicit user instruction can extend a consumed budget.

After two unsuccessful repair rounds, save errors, relevant tracked and untracked changes with their contents, findings, attempted approaches and remaining checks outside the task worktree. In a verified Autoship-created isolated worktree, restore only this task's changes to its original recorded baseline if that baseline can be fully reconstructed and there are no foreign edits or later accepted changes. Check paths and ownership before any destructive Git operation. Otherwise preserve the workspace and mark rollback unavailable; do not reset or clean a user's original checkout.

If budget remains and a fresh implementation context is available, hand off the failure evidence and retry from a documented safe state. If rollback was unavailable, the successor must first inspect and repair the preserved state. If three sessions are consumed, or a required fresh context cannot be created, pause this task and continue independent work. Preserve the single review across all attempts, including an interrupted or failed review dispatch.

## Previously delivered work

When later verification finds a regression, start a linked repair task from the current accepted result. Preserve the earlier task's evidence; never return the project to that old task's baseline. Use this only for an actual regression after delivery, not to relabel an unfinished task and reset its budget. Follow [implementation](implement.md) for the new repair task.
