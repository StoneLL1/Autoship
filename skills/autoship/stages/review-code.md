# Review one task

You are the independent reviewer. Read the task spec, relevant project requirements, the complete change since the task baseline, and verification evidence.

Check requirement coverage and concrete correctness or regression problems together. Return actionable findings with locations and impact in this one review. Keep the workspace read-only; do not fix code or spawn another reviewer.

The implementing agent will fix valid findings and verify the result. Use existing verification evidence; do not call a passed check pending merely because this read-only session cannot rerun it. Record genuinely unverified product conditions separately from findings.
