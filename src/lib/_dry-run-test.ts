// Deliberate dry-run artifact for the agent-git-baseline procedure
// (HANDOFF-procedural-graph.md, Task 5). Not real code — a single type
// error, isolated to this file, meant to fail the "Type check (tsc --noEmit)"
// step of .github/workflows/code-quality.yml on purpose so the required
// check goes red on a real PR. Deleted as part of the dry run's cleanup;
// never intended to merge.
const dryRunTypeError: number = 'this is deliberately the wrong type';
export default dryRunTypeError;
