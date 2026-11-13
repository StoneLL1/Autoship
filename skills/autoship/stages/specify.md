# Product, design and flow

For a new project, read the assigned document responsibility in [the planning route](plan-new.md) and handoff. Apply only its section below in this session; other applicable documents are completed by their own successors. For existing-project changes, update affected sections together as appropriate.

## PRD

Write prd.md or the established product document so a fresh designer or developer can understand the problem, intended behavior and boundaries without guessing what the user meant. Completeness and fidelity to the clarified requirements determine length; there is no short-form or page-count target. Use clear language and remove repetition without dropping decisions, examples or relevant edge cases.

For a new project, first read the full [discovery package](../references/discovery.md), including the interview answers and corrections, product research, implementation research and final design choice. For an existing project, read the affected requirements and change decisions. Reconcile source conflicts before drafting affected behavior; reuse settled answers rather than restarting the interview. Research can sharpen requirements and expose gaps, but additional product scope needs the user's decision.

Cover the following in a structure suited to the product:

1. **Problem and context:** target users, their current workflow and pain, why the outcome matters, and relevant evidence rather than invented market claims.
2. **Goals and success:** desired user outcomes and observable measures; distinguish functional acceptance from longer-term product metrics. Mark unknown targets explicitly instead of fabricating numbers.
3. **Scope and priorities:** the complete agreed release, later work, non-goals, rejected alternatives and their reasons. A first useful increment is part of the agreed scope, not a reason to omit the rest.
4. **User stories and journeys:** cover each agreed actor and capability, their intent and benefit, entry conditions, main behavior and relevant alternative paths. Include concrete examples from the interview where they clarify meaning.
5. **Functional requirements:** give requirements stable IDs. Specify triggering inputs/actions, business rules, visible outcomes, permissions, state/data changes and interactions with other requirements. Cover applicable empty, invalid, failure, interruption and recovery behavior. For CLI/API products include input/output contracts, errors and compatibility here.
6. **Product constraints:** relevant data lifecycle, privacy/security, accessibility, responsiveness, performance/scale, platform and integration requirements. Make constraints checkable when evidence allows; unsupported targets stay assumptions or open items.
7. **Design and reuse inputs:** carry the accepted visual direction and product-facing interaction constraints for design.md and app_flow.md. Incorporate useful comparable-product lessons with their source and adoption decision. Carry confirmed technical constraints and link implementation research for TECH_STACK.md; keep unselected technologies as candidates.
8. **Acceptance:** connect each in-scope requirement to observable scenarios using [quality](../references/quality.md), including relevant boundary/failure cases. Explain the initial state, action and expected result so later tasks can inherit the checks.
9. **Assumptions, dependencies and open questions:** distinguish user-confirmed decisions from delegated choices, unproven assumptions and blockers. Name the effect, next check or decision owner; explicitly deferred work stays outside current acceptance.

Merge related sections when that improves readability and omit inapplicable topics with a reason. The structure guides coverage, not filler. Preserve requirement-to-discovery references in the local handoff when source material is private.

Before declaring the PRD ready, compare it against the discovery decision checklist for a new project, or the existing requirements and confirmed change decisions for an existing project. Every current requirement, constraint, exclusion and correction in that scope must have a destination, and every promised capability must have observable acceptance. Flag unsupported additions and unresolved contradictions. A fresh reader must be able to explain the agreed product or behavior change and verify it from the PRD and accessible references. Record coverage and remaining prerequisites before returning to the route.

## Design

For a frontend, maintain design.md or its established equivalent. Read the completed PRD and, for a new project, the final design choice in the discovery record; existing projects inherit their accepted design and affected change decisions. Carry the selected reference, rationale and adaptations into concrete layout, typography, color, spacing, component and motion decisions, including accessibility and responsive behavior. Treat the earlier choice as input to this document, not as a completed design spec; resolve material deviations with the user.

## User flow

For a frontend, maintain app_flow.md or its established equivalent. Describe entry points, actions, state changes, empty/loading/error states and recovery, including relevant accessibility and responsive behavior. Use the completed PRD and design as inputs.

## Return to the route

The assigned document is ready when its planning-route criterion holds and it agrees with completed inputs; later documents may still be pending. Across the completed package, every promised journey must have an observable result and the requirements, design and flows must agree. Resolve material product tradeoffs with the user while continuing independent work, then return to the planning route for the next session boundary.
