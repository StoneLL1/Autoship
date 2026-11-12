# <stable task ID>: <observable outcome>

Use this inside the project's existing plan or task system. Replace placeholders with real decisions and paths, omit irrelevant sections, and keep a small task to a few paragraphs. Execution history belongs in the external handoff, not a second ledger here.

## Outcome and scope

<Who does what and sees which result; source of confirmed scope.>
<Relevant exclusions, compatibility constraints and invariants.>

## Context

- Implement: <requirement and relevant code paths, with a reason to read each>.
- Review: <acceptance, affected consumers and regression focus>.
- Dependencies: <earlier task outcome or prerequisite; omit if none>.
- Reuse: <existing pattern or inspected external source and revision; reason>.

## Acceptance

- A1: Given <starting state>, when <action>, then <observable result>.
- A2: Given <relevant failure or boundary>, when <action>, then <recovery or preserved behavior>.
- Checks: <actual commands/steps, working directory and what passing means>.
- Integration: <how this works with the surrounding product; combine with A1 if sufficient>.

## Decisions and uncertainty

<Decision and reason not inferable from code; blocking question or experiment if any.>
<Keep proposed behavior distinct from current behavior until verified.>

Before implementation, confirm that a fresh reader can locate the work and evaluate acceptance without inventing a product decision. Use [quality](../references/quality.md) for evidence and delivery, [sessions](../references/sessions.md) for history and ownership.
