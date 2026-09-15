---
name: procedure-guide
description: Query a procedural graph (data/*.procedure.json) for the ~6-line guidance block around the step you're about to act on, instead of re-reading the whole session history. Use when working through a procedure that has a Procedures database in Notion and an exported data/<id>.procedure.json — e.g. agent-git-baseline for any agent-driven git workflow (branch, commit, sign, push, PR, checks, review, merge). Triggers on "what's next in <procedure>", "check the gate for <step>", "am I blocked on <step>", or before any push/merge/checks-triage action once a procedure id is known.
---

# procedure-guide

A procedural graph answers "what next, in what order, under which
conditions" — the second graph type next to the topic mind map (see
`/Volumes/2TBSSD/Development/Projects/graph-notion/HANDOFF-procedural-graph.md`).
This skill is the agent-facing query layer described there: call it before
the next action instead of re-deriving the whole procedure from memory or
scrollback.

## When to use

- You know which procedure you're executing (its `id`, matching a
  `data/<id>.procedure.json` file — e.g. `agent-git-baseline`).
- You know (or can infer from the conversation / a tracked task list) the
  step you're about to act on, and which prior steps are already done.
- Before an action that a `gate` or `requires` edge could block — signing a
  commit, pushing, opening a PR, checking required-checks status, merging.

## How to call it

From the repo root:

```
npx tsx scripts/procedure-guide.ts <procedureId> <activeStepId> [completedStepId,completedStepId,...]
```

Example, partway through `agent-git-baseline` with commits signed but not
yet pushed:

```
npx tsx scripts/procedure-guide.ts agent-git-baseline s5-push-to-remote s1-branch-from-main,s2-author-commits,s3-sign-commit-gate,s4-identity-token-gate
```

This prints a short guidance block: the objective, the active step and its
pass criteria, anything still blocking it (`requires` not yet satisfied),
what comes next, the on-failure target, and any known pitfalls. **Treat the
block as a bias, not a dictate** — it narrows the option space, it does not
choose the action for you. If the block says `BLOCKED — not yet done: ...`,
do not proceed past the active step until those prerequisites are actually
true; do not "assume complete" just to clear the guidance.

If the active step is a `gate` and the guidance's `ON FAILURE` line reads
`HALT (fail-closed)` or names a specific step, and the gate genuinely fails
(e.g. required checks are red), stop and go to that target — do not retry
the same action hoping it clears on its own (see the `s8-checks-failed-triage`
step in `agent-git-baseline`, which exists specifically to block that
pattern).

## Logging

Every call appends one line to `data/gate-logs/<procedureId>.jsonl`:
`{ run_id, procedure_id, active, completed, guidance, at }`. This is local,
gitignored runtime data, not a build artifact — it exists so failed vs.
successful trajectories are reviewable at the next Tolaria baseline review
(see `data/NOTION-SCHEMA.md`'s refinement loop). You don't need to do
anything extra to log a call; the script does it as a side effect of
printing the guidance.

## What this skill does not do

- It does not edit the procedure. Refinement is manual, monthly, via
  Notion + the Tolaria review — never an auto-editing loop.
- It does not decide completion for you. You (the calling agent) are the
  source of truth for which step ids are "completed"; the script only
  projects the graph around whatever you tell it.
