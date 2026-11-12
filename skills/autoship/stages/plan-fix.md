# Fix an existing defect

Read the reported symptom, expected behavior and current evidence. Use [investigation](investigate.md) to locate the failing path and existing regression checks. Preserve the original input, observed output and version; distinguish a product defect from an unavailable environment.

Identify the cause before selecting a repair. A small reproduction or existing failing check is preferable to speculative changes. If the symptom cannot yet be established, state what evidence is missing and continue independent investigation without claiming a fix.

Put the correction, preserved behavior and regression check into the [task spec](split-tasks.md); a concise section in the current plan is sufficient. Update product or technical decisions only if behavior must change. An unresolved expected behavior goes to [clarification](clarify.md).

For a new fix request, obtain the route's [one planning review](review-plan.md), resolve findings with [plan repair](plan-repair.md), then [implement](implement.md). For an already active task with failed checks or review findings, use [repair](repair.md) and its existing review instead. Regressions discovered after accepted delivery follow [recovery](recover.md).
