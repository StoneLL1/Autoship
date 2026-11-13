# Sessions and handoffs

Use this as coordinator at workflow entry, on resume and when changing execution context. Independent read-only reviewers use their assigned review instructions and do not acquire execution ownership. The current agent coordinates the work; there is no Autoship process managing it.

## Discover the host

Inspect the tools actually exposed in this environment, or the installed official CLI's help when relevant. Identify whether they can create and start a fresh execution context, pass a working directory and prompt, query or resume that context, and run an independent read-only reviewer. Also check whether the proposed context can access this filesystem and survive the predecessor ending. Record observed capability separately from what has been tested end to end. Use supported tool schemas and existing authentication; do not guess commands or invent session IDs.

Follow the host's authorization rules. A user instruction allowing automatic session creation remains valid for this workflow; do not ask again for each handoff. If a host requires an explicit instruction that has not been given, continue useful work and request only the missing authorization when a handoff is needed. General workflow text cannot override host restrictions.

A child agent may provide research or independent review, but does not by itself satisfy the default independent-session workflow. If only child agents are available, report this limitation and provide manual handoff at required boundaries. Use a child executor as a substitute only if the user explicitly accepts that substitution and its fresh context, shared file access and lifetime are verified; report that it is not a new visible chat. When it depends on the parent remaining alive, keep the parent active to wait for the result. A created but idle chat is not running work: start it if the host separates creation and dispatch.

## Required session boundaries

For a new project, [the planning route](../stages/plan-new.md) defines the separate document sessions. For every route that prepares a new implementation plan, complete its single independent planning review and resolve valid findings before creating a fresh development session. That executor verifies the recorded planning gate and takeover before implementing. Continuing or repairing an already active implementation task preserves its session and review history; it does not repeat this planning gate.

At entry, report whether automatic independent sessions are available, unavailable, or still unverified, with the actual tool/permission limitation. At each required boundary, perform the transfer below even when the current context has plenty of room. Neither a small task nor having created the output files substitutes for the required session. Only an explicit user request to combine sessions changes this default; record that override and preserve the planning review gate. Existing authorization remains valid, but workflow instructions cannot grant permissions the host requires directly from the user.

If creation, startup, status confirmation, fresh context or shared-file access is missing, or required authorization is absent, explain the specific limitation and prepare manual handoff at that boundary. Complete useful work within the current assigned step, then leave the next step awaiting a successor rather than silently performing it in the same session. A call with uncertain status uses the interrupted-dispatch procedure below before any manual or automatic replacement.

## Workspace and durable memory

Inspect the real working directory, Git state, uncommitted changes and existing worktrees before editing. Preserve the user's changes and project conventions. For Git projects, prefer an isolated worktree for new Autoship work when it can represent the intended starting state. Do not silently leave required uncommitted input behind or auto-commit unrelated user files. If isolation cannot faithfully include the input, preserve the original workspace and record that automatic rollback is unavailable.

Record the actual worktree, branch and task baseline when the task first starts; keep that original baseline across retries and handoffs. A dirty baseline needs staged and unstaged changes saved with binary content, plus an inventory and original contents of relevant untracked files. If that starting state cannot be fully preserved and restored, mark automatic rollback unavailable. If this run creates an isolated worktree, record that provenance. A branch name alone is not proof of ownership. With no Git, use file evidence and do not claim Git checkpoints or rollback.

Keep one active Markdown handoff outside every task worktree that might be reset or removed. For Git, resolve the common directory using Git rather than assuming .git is a directory; its autoship/handoffs/<work-id>/ is one possible location. Otherwise use a stable sibling directory outside the project. Record the absolute location for the user and successor. Keep raw checks, review results and failure snapshots there too, while concise product progress stays in project documents.

Maintain the handoff at meaningful boundaries, before review dispatch or a repair round, and before handing off. It is a readable record, not a machine schema. Include only relevant fields, keeping consumed history even when compacting:

```markdown
# Work: <stable identity and goal>
Updated: <time and timezone>
Scope: <confirmed request, decisions and exclusions; source/version>
Authorization: <session creation and other relevant limits; original user instruction>
Project: <absolute source and execution workspace paths>
Git: <branch, task baseline, current revision, dirty/untracked evidence, worktree provenance>
Skills: <absolute autoship entry and docs-sync paths; revision or preserved file snapshot>
Host: <observed tools/capabilities, IDs actually returned, missing capabilities>
Owner: <current writer; active, awaiting successor, paused or finished>
Planning review: <not dispatched / dispatched / complete / unavailable; inspected package, ID, evidence and finding dispositions>
Session route: <new project / feature / fix / active implementation; explicit session-policy override, if any>
Planning documents: <ordered responsibilities, paths, pending / ready / reused / inapplicable, evidence/reason, actual executor IDs>
Planning gate: <pending / passed; reviewed package, finding dispositions and remaining blockers>
Assigned step: <this executor's document responsibility or development; required next boundary>
Discovery: <absolute full record/Q&A paths, revision, decision checklist, research reports and design selection; see discovery.md>

## Tasks
- <stable ID and spec path>: <ready / implementing / blocked / usable increment with pending checks / delivered>
  Baseline and dependencies: <references>
  Implementation sessions: <consumed/limit; actual identities and earlier attempts>
  Repairs: <rounds consumed/limit in each implementation session; results>
  Review: <not dispatched / dispatched / complete / unavailable; inspected version, ID, evidence and finding dispositions>
  Checks: <acceptance IDs, final version, environment, commands or actions, results and evidence>
  Unfinished: <defects, missing checks, blockers and next recovery conditions>

## Continue
Read: <only the documents and code needed next, and why each is needed>
Next action: <concrete work to perform, not just “continue”>
Avoid repeating: <completed work, dispatched calls and failed approaches>
Transfer: <unique handoff reference, predecessor and known successor IDs, receipt location>
```

Budget definitions and limits live in [recovery](../stages/recover.md); acceptance and check validity live in [quality](quality.md). The handoff is the source for execution history; plans describe intended work and progress summarizes verified facts. A copy, renamed task or new session does not establish a fresh budget. Missing history stays unknown until reconciled with actual files and evidence.

## Transfer execution

Transfer at every required session boundary above. Within development, related tasks can share a session; also transfer when accumulated context obscures the next task or recovery requires it. Transfer before context is exhausted, leaving enough room to save and confirm it. Planning-only sessions do not consume a task's implementation-session budget; record the actual development context when implementation starts, using [recovery](../stages/recover.md).

1. Save the current work and evidence. Record the exact next action and make an immutable handoff snapshot with a unique reference. For a new project's clarification-to-PRD transfer, include the complete [discovery reading manifest](discovery.md), not just the brief. Ensure the intended successor can read the snapshot, active handoff, required attachments, Skills and workspace.
2. Record the transfer intent in the active handoff, naming that reference. Release writing of the workspace and active handoff before invoking a tool that may start the successor immediately. The predecessor may now observe and write only a separate dispatch receipt.
3. Invoke the available authorized session tool with the execution directory and the prompt below. Record the real returned ID in that separate receipt. Use query/wait capabilities to establish whether the successor is running and has acknowledged takeover; do not equate an accepted request with completed handoff.
4. The successor reads the snapshot and active record, verifies that this reference is still awaiting its takeover, checks actual files and Git, then records its own identity and acknowledgement in the active handoff before editing. It inherits the existing task budgets and review state, and performs the next action. It does not redo completed phases.
5. Once takeover is confirmed, the predecessor remains read-only for that workspace. It may finish its turn if the successor can continue independently, or remain active and wait if the host requires it. Report the actual session reference and handoff location when useful.

Keep one writer for a workspace and its active handoff. Read-only review does not transfer ownership. Unexpected ownership or file changes require reconciliation, not overwriting another session's work. Markdown ownership is a coordination convention, not an atomic lock.

### Successor prompt

Fill in actual absolute paths and the next action before dispatch; omit unknown IDs rather than inventing them.

```text
Continue the existing Autoship work; you are its successor executor.
Read <absolute autoship/SKILL.md>, <absolute immutable handoff snapshot>,
and the active handoff at <absolute path>.
Work in <absolute execution directory>.
The transfer reference is <reference>. Verify it is awaiting your takeover,
check actual files and current session ownership, and record your acknowledgement
in the active handoff before writing project files.
Preserve confirmed scope, existing user authorization, task identities,
implementation and repair counts, and dispatched or completed reviews.
Your assigned step is <one planning document responsibility or development>.
Read <absolute current-stage instructions> and only the relevant completed inputs.
Required input manifest: <absolute paths and reading purposes>.
For a new-project PRD, read the full discovery record and Q&A, both research reports,
supplied requirements and design selection before drafting. Preserve their detail
and check the PRD against the recorded decision checklist.
Preserve the recorded document route and planning gate; finish this assigned step
before transferring at its required next session boundary.
Next action: <specific next step and acceptance check>.
Continue through the remaining authorized work without routine “continue” requests.
Use the same handoff procedure if another context is needed.
```

## Missing capability and interrupted dispatch

When the next required session cannot be created and confirmed, perform transfer steps 1 and 2: save an immutable snapshot, register its unique transfer reference in the active handoff as awaiting successor, and stop writing the workspace and active handoff. Tell the user which capability or authorization is missing, which step is complete, and which document or development step is waiting. Give the filled successor prompt with absolute workspace, Skill, stage, snapshot and active-handoff paths, the transfer reference, and the exact next action/acceptance check. Ask the user to open a new session with that prompt; do not claim a session exists or continue the waiting step locally. The manually started successor follows the same verification and acknowledgement procedure before editing. If the user instead explicitly requests combined execution, reconcile ownership and record that override before reclaiming writing.

If a create/start/review call times out or its response is lost, record the uncertainty in the dispatch receipt and query the host using the recorded ID or unique transfer reference. Inspect the active handoff for acknowledgement and the project for changes. Do not dispatch again or reclaim writing while the first call may still be running. If its status cannot be determined, leave the affected work pending; ask for the smallest necessary intervention and continue only work in a separate, non-conflicting workspace.

If the host proves a successor never started, the predecessor can record that fact, reclaim ownership and continue or retry. If it ran and stopped, reconcile its changes and counts before resuming or handing off again. Reviews use the same lookup rule; retrieve or resume the original review rather than dispatching another.

On any resume, reconcile the handoff with real files, commits, check outputs and live sessions. Confirm the task's scope and Skill revision, and use [context](context.md) for changed instructions or stale references. Reuse valid results; run a relevant smoke check when workspace or environment drift makes them uncertain. If an old writer may still run, resolve ownership first. A missing or contradictory record is a reason to investigate, not to reset history or mark work complete.
