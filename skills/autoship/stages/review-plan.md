# One planning review

## Coordinating agent

Check the handoff's planning-review record. If never dispatched, save the dispatch intent, then send the complete planning package and the reviewer instructions below to an independent, read-only agent. Save its actual ID and result. If already dispatched, retrieve or resume that review rather than starting another; interrupted or ambiguous dispatches follow [sessions](../references/sessions.md).

If independent review is unavailable, record it as pending and continue preparing materials or unrelated work; do not mark the affected plan ready for implementation. Resolve returned findings with [plan repair](plan-repair.md) and verify consistency yourself, without another planning review.

## Independent reviewer

Review the complete planning package once. Compare requirements, design, flows, technical assumptions, task coverage and [acceptance checks](../references/quality.md). Inspect relevant project evidence rather than relying on the planner's summary. Check that each promised outcome has a task and observable check, dependencies and shared interfaces agree, and a fresh implementer has usable reading pointers. Prefer the smallest sufficient package; the absence of an unnecessary document is not a finding.

For a new project, compare the PRD against the [discovery record](../references/discovery.md), its decision checklist, both research reports and final design selection. Look for lost qualifications, ignored corrections, research suggestions promoted to requirements without a decision, unexplained scope additions or omissions, and missing acceptance. Check that technical planning preserves actionable reuse findings for coding. The two research assignments do not count as this independent planning review.

Return gaps with stable IDs, locations, consequences and evidence. Separate blocking product ambiguity from implementation choices the agent can make. State coverage and limits even when there are no findings. Stay read-only and do not spawn another reviewer. The coordinating agent resolves valid findings; there are no separate reviews for each document.
