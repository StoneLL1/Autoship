# Clarify

Build shared understanding through a grill-me-style interview before planning. Read the request, existing decisions and relevant project context; adopt explicit answers and earlier confirmations. For a new project, complete the sequence below. When a feature, fix or research finding returns here, reopen only affected decisions and their dependents; retain completed research and an accepted design unless the change invalidates them.

## Interview the requirement tree

For a new project, create or resume the durable [discovery record](../references/discovery.md) before the first question. For a returning feature or fix, preserve the affected Q&A, decisions and corrections in its existing durable context without requiring a new-project discovery package. Map the product decisions as a tree: an answer may expose decisions that depend on it. Keep each relevant branch confirmed, open, explicitly delegated, or inapplicable with a reason.

Explore the following branches to the depth needed to describe the whole confirmed scope:

- Who uses it, in what situation, what they do today, what fails and why this outcome matters.
- The main journeys from entry to result, actors and permissions, inputs and outputs, rules and interactions between features.
- First-release priorities, later work, exclusions, tradeoffs and concrete examples of success.
- Relevant empty, invalid, failure, interruption and recovery cases; data ownership, persistence, privacy and compatibility.
- Actual platform, integration, accessibility, scale, timing or cost constraints, and how success will be observed.

Work through multiple rounds. Ask the highest-impact questions whose prerequisites are settled; use one question for a dependent thread, or a small numbered group of independent questions. Give a recommended answer and its consequence. Wait for the user's response before resolving that choice or asking its dependent questions. A recommendation, silence or an unanswered option is not confirmation.

After every answer, save it, update the tree and follow the newly exposed branches. Probe vague terms with examples, boundary cases and competing priorities. Resolve contradictions against earlier answers, preserving corrections and their reasons. Find facts in supplied material, the codebase or [targeted investigation](investigate.md) yourself; keep other independent questions moving while a factual prerequisite is unresolved. Broad product and implementation research comes after the requirement interview.

The interview has no fixed question or round limit. Completion depends on coverage, not on having enough to start a small increment. Before closing, check every relevant branch above, recap the outcome, complete scope, exclusions and remaining assumptions, and ask whether that reflects the user's intent. Existing explicit confirmation of the same decisions counts; ask only for missing confirmation or corrections. Each open item must be either a blocking product choice to resolve now or a named nonblocking uncertainty with its consequence and next check. A reversible implementation detail may be an explicit assumption; intended product behavior needs a user decision or explicit delegation.

If the user pauses, save the exact next question and leave the interview unfinished. If the user explicitly delegates remaining choices or requests proceeding with assumptions, record that instruction and the affected assumptions; do not describe them as user-confirmed requirements.

## Research after the interview

For a new project, once the requirement interview is complete, run [two research subagents](research-new.md): one studies comparable products to improve the PRD; the other studies implementation approaches and reusable open source for technical planning and development. Preserve both reports and reconcile their implications with the discovery record. Any newly exposed product choice returns to the affected interview branch before continuing.

## Finish with the user's design choice

For a frontend, the final clarification interaction settles the visual direction for the later design.md session. Carry forward an existing accepted design or an explicit user-supplied direction. Otherwise present two or three concrete, meaningfully different styles suited to the confirmed audience, content and interaction density. Explain layout, typography, color, density and interaction character, with accessible references or previews where available, and recommend one. [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) is an optional reference source, not an installation dependency.

Wait for the user to choose, combine, correct or explicitly delegate the choice. “No preference” must be clarified as delegation if that is not already clear. If references are unreachable, offer clearly labeled self-authored directions and let the user choose. Record the selection, rationale, source/revision or retrieval date, adaptations and rejected directions in the discovery record. Keep this as design input; the separate design session produces design.md. For a CLI/API without a visual frontend, record this step as inapplicable.

## Exit to planning

For a new project, ready when the interview coverage and confirmation are recorded, both research reports are reconciled (or their explicit limitations are recorded without blocking the next document), the applicable design choice is settled, and the complete [discovery package](../references/discovery.md) is readable by the successor. Then [start the independent PRD session](plan-new.md) with that package.

For a returning feature or fix, ready when affected decisions and their dependencies are settled, corrections and assumptions are saved in the existing context, and the caller can continue without inventing product behavior. Return to that route with these inputs; the full new-project package and two research assignments are not prerequisites. Routine planning stages need no new approval.
