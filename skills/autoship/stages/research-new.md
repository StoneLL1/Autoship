# Research a clarified new project

Run after the requirement interview and before the final design choice. Read the [discovery record](../references/discovery.md), including confirmed scope, exclusions, constraints and unresolved factual questions. Use [investigation](investigate.md) for source quality, bounded experiments and evidence; those rules apply to both assignments below.

## Dispatch two independent research assignments

Use two subagents with the same settled requirements context, in parallel when the host supports it. Give each the discovery path, relevant supplied materials, its assignment below and a request to return a sourced report. They investigate and report; the coordinator owns project files, user decisions and the shared handoff. These are research roles, not independent planning reviews or replacement document sessions.

**Product research — input to the PRD.** Study comparable products serving the same user and job, including relevant open-source products. Compare actual journeys, capabilities, business rules, failure/recovery behavior and scope choices. For each useful reference, explain what can improve our requirements or acceptance, what should be excluded and why. Return sources with dates/revisions, the inspected behavior, implications tied to our confirmed needs, differences that limit applicability, and product questions the interview may have missed. A feature catalogue alone is insufficient; distinguish observations from proposed scope additions.

**Implementation research — input to technical choices and coding.** Investigate viable approaches, similar open-source implementations, existing libraries/frameworks and integrations that can satisfy the confirmed journeys. Inspect the relevant source or official documentation. Compare reuse with a small custom implementation, considering fit, maintenance/activity, license, compatibility, deployment, cost and material limitations. Identify concrete reusable modules/patterns and source entry points, what needs adaptation, evidence for feasibility and any bounded check still required. Recommend options with reasons; the later technical session makes the recorded selection. Never imply that code is tested or licensed for reuse without evidence.

## Reconcile and preserve

Wait for both results and inspect them against the assignments and confirmed scope. Save each full report in the external discovery package, plus a disposition of its material recommendations. Resolve missing factual evidence through targeted follow-up; bring new product tradeoffs to the user through the affected [clarification](clarify.md) branch. Continue only independent work while a dependent choice remains open. The final design choice follows this reconciliation.

Record actual agent identities, status and evidence. If an agent call has uncertain status, reconcile it using [sessions](../references/sessions.md) before redispatching. A completed report can survive interruption or later scope corrections; update only findings invalidated by the change.

If subagents are unavailable or only one can run at a time, state the actual limitation. Run the assignments sequentially when possible; if delegation is unavailable, the coordinator may perform both investigations as a clearly labeled fallback. Preserve separate product and implementation results, evidence gaps and their consequences. This fallback does not replace required independent reviews or document sessions. Network failure requires local evidence or an explicit unavailable-source finding, not invented research. A missing fact that affects the PRD blocks its dependent requirement; a technical uncertainty confined to stack selection may remain a named prerequisite for that later session.

Ready when both assignments have a report or explicit limited-result record, the coordinator has reconciled implications, and remaining uncertainty has a named dependent step. Return to clarification's final design choice.
