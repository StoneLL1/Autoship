# Executable tasks

Choose the fewest useful tasks for the plan's difficulty and uncertainty; small projects can use one or two. Avoid splitting mechanically by file, page or document. Give each task in tasks.md a stable ID and a concise spec: intended behavior, necessary boundaries, completion checks and references. Add dependencies where needed; reference existing requirements instead of copying them.

Use headings such as `## T01: Open a document`. A fresh agent should be able to start from this spec and its references without another instruction from the user. Include integration acceptance in the completion criteria.

Decide session grouping separately from task count. Related tasks may share an implementation session; use a new context when it improves the work or failure recovery requires it. Keep each task's acceptance and single review identifiable. Integration acceptance can be part of an existing task rather than forcing another task.

Create the small execution manifest described in [runtime.md](../../../docs/runtime.md). It indexes specs and runnable checks without copying requirements. The runner handles scope confirmation and planning review. Use sessionGroup for related tasks where helpful; execution results can request reuse or a fresh context.
