import { readFileSync } from "node:fs";
import { validateProceduralGraph, localize, toGuidance, toMindMap } from "../src/lib/procedural-graph";
import type { ProceduralGraph } from "../src/lib/procedural-types";

const g: ProceduralGraph = JSON.parse(readFileSync("data/harness-gates.procedure.json", "utf8"));
const errs = validateProceduralGraph(g);
if (errs.length) { console.error(errs); process.exit(1); }
console.log(toGuidance(localize(g, "s4-tool-validation-gate", ["s1-injection-gate", "s2-model-reasoning", "s3-pii-redaction"])));
console.log(JSON.stringify(toMindMap(g), null, 2));
