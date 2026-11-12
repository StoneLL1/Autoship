# New project

After clarification, reuse completed [investigation](investigate.md) and resolve prerequisites for the next document. Record this ordered route in the external handoff. Each applicable document that needs work gets a newly created independent session, including PRD after the initial clarification session. Use [sessions](../references/sessions.md) to create, start and confirm each successor before it writes.

| Document session | Instructions and inputs | Ready when |
| --- | --- | --- |
| PRD (`prd.md`) | [Product specification](specify.md), confirmed brief and investigation | Scope, exclusions and observable acceptance cover the confirmed outcome. |
| Design (`design.md`, frontend only) | [Design](specify.md), PRD and accepted visual reference | Layout, components, visual and accessibility decisions support the PRD. |
| User flow (`app_flow.md`, frontend only) | [Flow](specify.md), PRD and design | Journeys, state changes, errors and recovery agree with the product and design. |
| Technical choices (`TECH_STACK.md`) | [Technical choices](choose-stack.md), completed product/design/flow material | Implementation and verification paths are viable; prerequisites are explicit. |
| Project conventions (`AGENTS.md`) | [Project conventions](init-project.md), existing rules and completed decisions | Real document and verification entry points are usable; existing rules are preserved. |
| Implementation plan (`implementation_plan.md`) | [Implementation plan](plan-implementation.md), completed planning material | Ordered increments cover outcomes, dependencies and integration acceptance. |
| Task specs (`tasks.md`) | [Executable tasks](split-tasks.md), implementation plan | Stable task IDs, context pointers and observable checks are ready for execution. |

Use established equivalent filenames or sections where needed, while retaining a separate session for each responsibility above. Keep documents brief and implementation task count proportionate. For CLI/API projects, record nonvisual behavior in the PRD and mark design/visual-flow sessions inapplicable. Reuse an existing artifact only after checking its readiness against the current confirmed scope; record the evidence or reason for each reused/inapplicable step. A draft from clarification does not by itself complete a document step.

A document executor reads the assigned instructions and relevant completed inputs, finishes only its assigned document responsibility, records its path, readiness evidence and actual session identity, then hands off to a fresh session for the next unfinished document. Shared instructions such as specify.md do not authorize writing the other documents in that same session. Record route progress before transferring; successors resume the next unfinished step instead of restarting planning. Corrections to earlier documents during later planning or finding resolution may be made by the current sole writer and do not restart document sessions or reviews.

After all applicable documents are ready, the final planning executor coordinates [one independent planning review](review-plan.md) of the complete package, then resolves valid findings using [plan repair](plan-repair.md). Once the package is ready, that review is complete and all blocking findings/product choices are resolved, record the gate as passed and hand off to a newly created [development session](implement.md). A planner continues only planning and repairs until this gate passes; the reviewer remains read-only. Missing session capability follows the manual handoff procedure at the next required boundary, even for a small project.
