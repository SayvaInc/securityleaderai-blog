# SecurityLeader.ai — Content & Trust Corrections Roadmap

**Source:** External ChatGPT review of the live site (homepage, research nav,
selected technical articles, Panjabi awareness pages), dated 2026-09-15.
**Status of this doc:** Triaged against actual code/content on `main` and the
live site before anything here was accepted. Per this project's own AI-review
rule — *findings are hypotheses, not verdicts* — every item below is marked
either **CONFIRMED** (I read the cited file/line or hit the live route myself)
or **UNVERIFIED** (needs a check I can't do from here — audio listening,
rendered layout, a live crawl). Nothing here should be treated as done; it's
a prioritized backlog, adapted from the review into file:line-anchored tasks.

**Framing the review opened with, worth keeping:** SecurityLeader.ai serves
three distinct audiences with different jobs-to-be-done —

| Audience | Needs to quickly understand | Recommended experience |
|---|---|---|
| Executives | What affects us, what decision is needed, who owns it | Short decision brief: business impact, evidence, recommended action, residual risk |
| Technical practitioners | What was tested, how to reproduce it, where the control fails | Versioned methodology, working examples, expected results, limitations |
| Nontechnical Panjabi readers | Is this happening to me, what should I do now? | Plain-language safety steps, reviewed audio, country-specific help, easy sharing |

**Sequencing (the review's own recommendation, and it's right):** evidence
corrections and Panjabi usability before any visual redesign. Nothing in the
February 2026 roadmap (`securityleader-solo-researcher-roadmap.md`) should
jump ahead of the items below.

---

## Standout finding: item 7 is already fixed and sitting unmerged

The review's complaint about standalone Latin "UK" in Panjabi content
(item 7 below) turned out not to be a new bug. **PR #2 — "pa-in: UK → ਯੂ.ਕੇ.
country-name consistency + R29 lint guard" — has been open since 2026-06-20
(~87 days)** with the exact fix already committed (`dacb0d5`, `8d58abd`).
`docs/content-rigor.md` on `main` even documents R29 as *"Reserved... arriving
in PR #2"* — the rule is written up but the branch never landed.

This is the textbook case the global Avoidance Detection rule describes: a
PR open 14+ days with no sign of a genuine blocker. **Before writing any new
code for item 7, review and merge PR #2.** That alone fixes the Latin-UK
finding across every `posts-i18n/pa-in/*.md` file at once, and turns R29 from
documented-but-inert into an enforced CI gate.

---

## Highest-priority corrections (the review's numbering, kept for traceability)

### 1. 97.1% statistic conflates description quality with malicious poisoning — CONFIRMED
**File:** `posts/tool-poisoning-guard.md` (excerpt + body ×3, lines 4, 14, 22, 50)
The post's own text: *"An academic study of 856 real-world tool descriptions
found 97.1% contained some defect — ambiguity, missing constraints, or an
outright injected instruction."* One number covers three different things —
unclear documentation, security weakness, and deliberate poisoning — but the
post's framing (Tool Poisoning, MCP03, CVE-2025-54136) reads it as a
poisoning-prevalence stat. **Fix:** separate the three categories explicitly
wherever 97.1% appears; link the study (arXiv:2602.14878) directly beside the
number with version/sample size, not just in the reference list.
**Energy:** Matcha (~30 min, four edit sites in one file).

### 2. "non-bypassable" overclaims GitHub ruleset enforcement — CONFIRMED
**File:** `posts/agent-git-baseline.md:25` — heading literally reads
*"Layer 2 — Enforcement (server-side, non-bypassable)."*
GitHub rulesets support configured bypass permissions for roles, teams, and
apps — the control's server-side *location* doesn't make it unconditionally
un-bypassable. **Fix:** reword the heading, add the required ruleset config
(bypass list empty / restricted to break-glass roles only), and ideally
demonstrate one rejected push using the actual agent identity rather than
asserting the property.
**Energy:** Matcha (~45 min: reword + one verification screenshot/log).

### 3. WhatsApp pa-in post inverts "can wait" logic — CONFIRMED
**File:** `posts-i18n/pa-in/whatsapp-family-emergency-scams.md:20,46,60`
Current text (line 46): *"a real family emergency can wait for a two-minute
call. If they can't wait for you to call back — then it isn't real."* The
verification instruction itself (call the known number, wait if unanswered)
is sound and should stay. The problem is the *inference* — inability to wait
is not proof of fakeness; a genuine emergency may not tolerate delay, and
that reader needs to know real emergency help is the right move, not "so it
must be fake." **Fix:** keep the verify-via-known-number instruction, drop
the fake-if-it-can't-wait framing at all three sites, add one line: if it
truly can't wait, that's what emergency services are for.
**Energy:** Matcha (~30 min, precise wording matters — consider a native
Panjabi-speaker pass given the T/L/R/H glossary discipline this project
already uses elsewhere).

### 4. IDCARE number wrong for New Zealand; bank-hold framing overstates certainty — CONFIRMED
**File:** `posts-i18n/pa-in/reporting-centers-onepager.md:31,92,97`
The directory lists one combined "Australia / NZ" row using only the
Australian IDCARE number (1800 595 160) for both countries. IDCARE's actual
numbers: **AU 1800 595 160** (correct as-is), **NZ 0800 121 068** (currently
missing — NZ readers get the wrong number). Separately, line 40 says banks
"often" hold funds 24–72 hours — true as a description, but doesn't tell the
reader recovery isn't assured or to explicitly ask the provider about
stopping/recovering the transfer.
**Fix:** split the AU/NZ row into two rows with correct numbers; this
directory is referenced from *every* pa-in post's reporting table
(`whatsapp-family-emergency-scams.md:91`, `tech-support-scam-elders.md:92`,
`gurdwara-charity-donation-fraud.md:98` all repeat similar IDCARE rows) — per
this project's own working preference, fix the shared source and check
whether the repeated per-post tables should transclude from one source
instead of being copy-pasted five times (they currently aren't — that's how
the AU/NZ error could exist in multiple places without being caught by a
single fix). Add "ask about stopping/recovering the payment; recovery is not
assured" to the bank-hold line.
**Energy:** Espresso (~1–2 hrs: fix + decide on de-duplicating the repeated
reporting tables — this is the same "two files/tables holding the same
numbers with no link between them will drift" pattern already logged as a
lesson elsewhere in this project's Notion decision log).

### 5. Root `<html lang>` hardcoded to "en" on Panjabi pages — CONFIRMED
**File:** `src/app/layout.tsx:54` — `<html lang="en">`, unconditional.
The per-locale `<article lang={meta.hreflang}>` in
`src/app/blog/[slug]/[post]/page.tsx:124` *does* correctly set `pa-IN` at the
article level, but the document's root/predominant language stays `en`
regardless of route. Per W3C guidance this affects how assistive tech
interprets the whole page, not just the article region.
**Fix:** root layout is shared across all routes, so this needs either (a) a
locale-aware layout segment for the `/blog/pa-in/*` route (check whether
`src/app/blog/[slug]/[post]/` can host its own `layout.tsx`, or whether App
Router requires reading the pathname via `headers()` in the root layout and
switching `lang` there), or (b) a client-side `document.documentElement.lang`
set early in the pa-in article's render. Needs a design decision before
coding — flagging as **needs-design-decision**, not a blind fix.
**Energy:** Matcha–Espresso depending on which approach; investigate Next 16
App Router's supported pattern for this before starting.

### 6. Live pa-in audio described as AI conversation, SOP specifies verbatim read-aloud — UNVERIFIED, plausible cause identified
**Files:** `docs/panjabi-audio-sop.md:3,83` (documented intent: *"a faithful,
single-voice Gurmukhi read-aloud... the page itself is the verbatim
transcript"*) vs. the review's claim about what's actually live.
I can't listen to the live audio from here, so this is not confirmed — but
`docs/panjabi-audio-sop.md` and `scripts/generate-audio.mjs` are both
untracked/local-only (not yet on `main` per `git ls-files`), and per this
session's own memory the Gemini-TTS single-voice pipeline was "built,
pending real GEMINI_API_KEY run" — i.e. not yet deployed. The February 2026
roadmap's own Phase 1 suggested "NotebookLM audio overviews," which produces
a two-host *conversational* format by default. **Working hypothesis:** what's
live today predates the verbatim-SOP pipeline and is a NotebookLM-style
overview, not yet replaced. **Before fixing:** do the listening comparison
the review recommends — pull up `tech-support-scam-elders` pa-in audio and
check against the SOP's verbatim-transcript claim directly.
**Energy:** Berry to verify (just listen + compare transcript), Espresso to
actually ship the verbatim pipeline live once the GEMINI_API_KEY run happens.

### 7. Standalone Latin "UK" in Panjabi content — CONFIRMED, already fixed, unmerged
See "Standout finding" above. **Action: review + merge PR #2**, not a new fix.

---

## Confirmed structural findings (from the review's broader recommendations)

### Homepage topic links all point to the same unfiltered `/research` — CONFIRMED
**File:** `src/app/page.tsx` — inside the `topics.map()` loop, every topic
card renders `<Link href="/research">` (no query param, no per-topic filter),
identical regardless of `topic.slug`. Contrast with the featured-tool card
higher on the same page, which does link `href="/research?tab=tool"` — so
the pattern for a filtered link already exists in this codebase, it's just
not applied to the four topic cards.
**Fix:** `href={`/research?tab=${topic.slug or mapped filter}`}`, matching
whatever `research-hub.tsx` reads on mount (see next item).
**Energy:** Matcha (~30 min once the tab/URL sync below is fixed).

### Research tab switching doesn't update the URL — CONFIRMED
**File:** `src/app/research/research-hub.tsx` — `tabParam` is read from
`useSearchParams()` and used to *seed* `activeTab` on mount (line 37), but
`onValueChange` (line 73) only calls `setActiveTab` — no `router.replace`/
`push` writes the tab back to the URL. Selecting a different tab or search
term is state-only, not shareable via link.
**Fix:** wire `onValueChange` (and the search box) to `router.replace` with
updated query params, matching the read-side pattern that already exists.
This is also the direct prerequisite for the homepage topic-link fix above —
do this one first.
**Energy:** Matcha (~1 hr, one file).

---

## Not independently verified — needs a check I can't do from here

- **Panjabi reading-column width / font size** (review cites ~1,232px column,
  16px body text on desktop) — needs actual rendered-page inspection at a
  real viewport, not a code read.
- **Homepage ordering** (February research above September insights) —
  true by construction if sorted by publish date and February content hasn't
  been updated; worth a quick "Featured" vs "Latest" labeling decision, not
  a bug to fix so much as an editorial call.
- **10 Dependabot alerts (4 critical) on the default branch** — surfaced
  independently during this session's own `git push` (not from the ChatGPT
  review), larger than the 6 (now 0) `npm audit` found and fixed on
  2026-09-14 (see `CLAUDE.md` → Known Accepted Risks, Phase D). Different
  count suggests a different ecosystem or scope (GitHub Actions, Python
  audio scripts, etc.) — check the Dependabot dashboard directly before
  assuming it's the same set already patched.

---

## Practical implementation order (adapted from the review, sequenced)

| Order | Work | Why this order | Completion evidence |
|---|---|---|---|
| 1 | Merge PR #2 (R29 + UK→ਯੂ.ਕੇ.) | Already done, zero new work, unblocks the lint gate | `npm run lint:content` shows R29 active; grep for bare `\bUK\b` in `posts-i18n/pa-in/*.md` returns nothing |
| 2 | Items 1–4, 7 (claim wording, emergency guidance, IDCARE contacts) | Factual corrections, no design decisions needed, small independent edits | Diffs reviewed per file; consider a native-speaker pass on item 3 |
| 3 | Item 5 (root `lang`) — after a design decision on approach | Needs an App Router pattern decision first | Panjabi page root `<html lang="pa-IN">` confirmed via view-source |
| 4 | Homepage topic links + research tab URL sync (do tab-sync first) | One depends on the other | Selecting a tab updates the URL; topic cards land pre-filtered |
| 5 | Item 6 (audio) — verify by listening, then ship the pending SOP pipeline | Verification is cheap; shipping depends on the GEMINI_API_KEY run already logged as pending | Listening comparison documented; live audio matches SOP transcript |
| 6 | Everything in the February 2026 roadmap (`securityleader-solo-researcher-roadmap.md`) | Explicitly sequenced after trust/accuracy per the review's own framing | N/A — separate doc |

This was a content and desktop-browser review, not a penetration test or
full accessibility audit. Mobile behavior, audio accuracy, screen-reader
pronunciation, performance, and repository-level enforcement (does CI
actually block on `lint:content` errors?) remain untested.
