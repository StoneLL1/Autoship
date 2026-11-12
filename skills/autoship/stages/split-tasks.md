# Executable tasks

Choose the fewest useful tasks for the plan's difficulty and uncertainty; small projects can use one or two. Split where outcomes can meaningfully be accepted independently, rather than mechanically by file or layer. Keep a task's tests and documentation with its deliverable. Give each task a stable ID and a concise spec in tasks.md, the existing plan or task system, using [the task template](../assets/task.md) where useful.

Use headings such as `## T01: Open a document`. State observable behavior, boundaries, [acceptance checks](../references/quality.md), dependencies and [reading pointers](../references/context.md). A fresh agent should be able to locate the work and evaluate acceptance without another product instruction. Include integration acceptance in an appropriate task.

Decide session grouping separately from task count. Related tasks may share an implementation session; use a new context when it improves the work or failure recovery requires it. Keep each task's acceptance and single review identifiable. Integration acceptance can be part of an existing task rather than forcing another task.

Point the handoff to these specs and checks. Markdown is sufficient; there is no machine execution manifest. Preserve task identity and consumed budgets if the plan changes. Return to the planning route for its single overall review, finding resolution and required handoff to development.
