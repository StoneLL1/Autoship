# Technical choices

Read the PRD, relevant design/flows, existing stack and investigation results. For a new project, read the implementation research in the [discovery package](../references/discovery.md), including inspected open-source entry points, reuse options, licenses and unresolved feasibility checks. Reuse the current stack unless evidence shows it cannot meet a confirmed requirement. For new choices, compare the simplest viable options against deployment target, integration, maintenance and the actual constraints.

Record the decision, reason, meaningful alternative and verification method in TECH_STACK.md or a section of the existing plan. Explain which researched implementations or libraries to reuse, adapt or reject and why; preserve source/revision pointers and relevant limitations for coding task context. Inspect the installed version and official interface before depending on a library or service; record prerequisites and necessary compatibility or migration work.

Resolve a consequential technical unknown with source inspection or a small experiment using [investigation](investigate.md). Ready when the next increment has a viable implementation and verification path; a dependency not yet proven remains a named prerequisite, not an established capability. Return to the planning route.
