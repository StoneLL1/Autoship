# Acceptance and evidence

Use when writing task acceptance, preparing a review, repairing findings or delivering work. This is the shared definition of verified delivery; stages refer here instead of inventing their own success criteria.

## Make acceptance observable

For each promised behavior, state the initial condition, action and expected result. Include relevant failure or recovery behavior and compatibility constraints. Give checks stable IDs when several tasks or sessions need to refer to them. A short task can keep everything in one spec using [the task template](../assets/task.md).

Choose checks from the actual project tooling. Use targeted tests for logic and regression risks, existing build/type/lint checks for integration, and a real user-path check for behavior those commands cannot establish. For frontend changes, read the project's design and flow documents and inspect the rendered result, including affected viewport, keyboard interaction and loading/empty/error states. Record applicable motion and reduced-motion behavior when motion changes. A screenshot proves only what is visible in that state.

For bug fixes, reproduce the original symptom or establish it from reliable existing evidence, then demonstrate the repaired behavior. Where practical, make a regression check fail on the original version and pass on the candidate. Documentation-only changes need executable examples, reference checks or scenario walkthroughs appropriate to their claims, not artificial application tests.

## Record what the check proves

Keep a compact acceptance table in the handoff or existing verification document; store raw outputs outside the task worktree using [sessions](sessions.md).

| Check | Version and environment | Action and expected result | Observed result and evidence | Status |
| --- | --- | --- | --- | --- |
| Stable acceptance ID | Commit plus dirty diff/file snapshot if any; relevant runtime/tool version | Actual command with working directory, or repeatable UI steps | Exit code and relevant assertions/output; log or screenshot path | pass / fail / pending |

These cells describe required information, not a machine schema. Combine rows that share a command. Mark unused checks not applicable with a reason instead of pretending they ran. For asynchronous commands, wait for completion and read the result; a launch receipt, truncated output or a file's mere existence does not prove success. Label mocked, simulated and real environment evidence explicitly.

Evidence applies to the version, inputs and environment inspected. After edits, rerun affected checks and integration checks whose assumptions changed. Retain still-relevant evidence for unchanged behavior with its original version; do not label it a new run. Once checks pass, repeat only for a change, failure or unresolved concern. An unavailable environment is pending; a reproducible wrong result is a defect. Keep pre-existing failures separate and explain their effect on acceptance.

## Resolve the one review

Record the review's inspected version and full findings. For each finding, preserve its identity, impact, resolution or evidence-based reason for rejecting it, and the check of the repaired result. The implementing agent verifies subsequent edits; this is not a second independent review. A completed review with unresolved valid findings is not accepted work. Review dispatch, ambiguity and recovery follow [sessions](sessions.md) and the task's existing history.

## Delivery condition

A task is delivered when its confirmed acceptance is satisfied, its required independent review is complete, valid findings are resolved, final relevant checks pass, and affected documentation matches the result. The whole request also needs its integration acceptance and planning review resolved. A green build alone does not establish this condition.

Otherwise report a usable increment or unfinished work with the exact failing or pending check, its reason, and the next action. Avoid merging distinct facts into a single “done” label: implemented, verified and delivered have different meanings. A change in scope needs its source recorded and coverage rechecked; existing authorization and review history remain in force.
