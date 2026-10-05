# Data Extraction Quality & UI Scope Isolation Invariants

> **Scope**: Scrapers, text parsers, heuristic extractors, LLM prompts/schemas, API routes, and UI view components (Table, Kanban, Grid, Calendar).

---

## 1. Context & Root Cause Analysis

Recent bugs identified two critical quality failure modes:
1. **Metadata Pollution (Job Offer Text in Salary Field)**:
   - The web scraper collapsed all HTML block elements into a single giant line via `.replace(/\s+/g, ' ')`.
   - The heuristic salary regex used a greedy match (`[^\n\r]*`) after the currency keyword, swallowing up to 3,000 characters of job duties, benefits, and company narrative.
   - LLM prompts and JSON schemas lacked strict length boundaries and explicit negative instructions forbidding offer descriptions.
   - Consumer forms (JobModal and Chrome Extension popup) blindly populated input fields without validating length or structure.
2. **UI Feature Leakage (Unsolicited Stage Badges in Table View)**:
   - When introducing stage tracking and calendar integration, a status history badge (`etap: <date>`) was injected into `JobTable.tsx` without explicit user requirement, cluttering the clean tabular interface.

---

## 2. Invariants

### Invariant 1: Defense-in-Depth for Extracted Metadata
Data extracted from external or generative sources (HTML pages, clipboard text, LLM outputs) must be sanitized and bounded at **every tier** of the pipeline:

```
[1. Scraper / DOM] ──> [2. Parser / LLM] ──> [3. API Route] ──> [4. UI Input / Extension]
Preserve block          Strict regex /         Deterministic        Sanitize & validate
newlines; do not        length limits &        cleanSalary()        length before
flatten paragraphs      negative prompts       sanitizer            populating state
```

1. **Scraper / DOM Tier**:
   - Always preserve block boundaries (`<br>`, `</p>`, `</div>`, `</li>`, `</h1>`–`</h6>`) as newline characters (`\n`) before stripping HTML tags.
   - NEVER collapse all whitespace across an entire document into a single line (`\s+ -> ' '`).
2. **Parser / LLM Tier**:
   - Heuristic regexes must **NEVER** use unbounded greedy matches (`.*` or `[^\n\r]*`) after matching keywords or currencies.
   - LLM prompts must include explicit negative constraints (e.g. *"Only return the numerical range and currency. NEVER include job duties, benefits, requirements, or offer text"*).
   - LLM JSON schemas must specify maximum lengths (e.g. `maxLength: 50` or description specifying concise format).
3. **API Route Tier**:
   - Always pass both AI-extracted and heuristic-fallback fields through dedicated sanitizers (e.g. `cleanSalary()`, `cleanCompanyName()`) before returning JSON responses.
4. **UI / Consumer Tier**:
   - Before setting form state in modals (`JobModal`) or extensions (`popup.js`), guard against narrative strings (e.g. `salary.length <= 80 && !salary.includes('\n')`).

### Invariant 2: Salary Field Formatting Contract
The `salary` field must strictly represent monetary compensation ranges or single rates:
- **Maximum Length**: Hard cutoff at 70 characters.
- **Allowed Content**: Digits, spaces, currency symbols (`PLN`, `zł`, `EUR`, `USD`, `GBP`), contract qualifiers (`B2B`, `UoP`, `UoD`, `UoZ`, `netto`, `brutto`, `+ VAT`), and time units (`/h`, `/msc`, `/miesiąc`).
- **Forbidden Content**: Narrative sentences, punctuation marks followed by words (`. Dołącz do nas`), bullet points, benefit descriptions (`Multisport`, `Medicover`), or multiline text.

### Invariant 3: UI View Scope Isolation (Anti-Leakage)
Every application view (Table, Kanban, Grid, Calendar) has a distinct UX purpose and visual density contract:
- **Table View**: Strictly tabular, high-density, easily scanable. Table cells must only contain the primary data point and the interactive control (e.g. a clean `<select>` for status). Do NOT inject secondary metadata badges (such as stage history, detailed timestamps, or timeline notes) into table rows unless explicitly requested in user requirements.
- **Kanban / Grid**: Medium density cards with badges and tags.
- **Calendar**: Temporal view visualizing events, deadlines, and stage transitions.
- **Rule**: Introducing a feature for one view (e.g. stage history in Calendar) must NOT cause opportunistic code additions to other views without explicit request.

---

## 3. Rules for AI Agents

1. **When Modifying Parsers or Scrapers**:
   - Always test with realistic multi-paragraph job offers containing salary mentions followed by long descriptions.
   - Verify that non-salary text is completely excluded.
2. **When Editing Shared Views**:
   - Check existing tests or add regression tests verifying the visual contract of stable views (e.g. `tests/JobTable.test.tsx`).
   - Never add "nice-to-have" badges or extra information to views that were not part of the active user prompt.
3. **When Writing Tests**:
   - Maintain regression test coverage for boundary cutoffs in `server/services/heuristics.service.test.ts`.
   - Maintain visual contract assertions in `tests/JobTable.test.tsx` verifying that stage badges do not appear in the table.
