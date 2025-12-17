---
description: Classify conversation items as technical debt or future enhancements and store them in docs/ for future reference.
---

# Classify Conversation

## Overview

Analyze the current conversation context to identify and classify items as either **technical debt** or **future enhancements**. Store classified items in `docs/technical-debt.md` or `docs/enhancements.md` for future reference.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The user may want to:
- Focus only on technical debt or only on enhancements
- Classify a specific topic discussed
- Add additional context to items being classified

## Execution Steps

### Phase 0: Get Current Date (REQUIRED FIRST STEP)

**CRITICAL**: Before doing anything else, you MUST determine today's date.

Run this shell command to get the current date:

```bash
date +%Y-%m-%d
```

Store the output as `CURRENT_DATE`. This is the date you will use for ALL items being classified. Do NOT use any other date source - always use the result of this command.

**Example**: If the command outputs `2025-12-16`, then `CURRENT_DATE = 2025-12-16`

### Phase 1: Analyze Conversation Context

**Review the conversation history**

Carefully analyze the entire conversation thread for mentions of:

**Technical Debt Indicators:**
- Workarounds or temporary solutions
- TODO comments or "fix later" mentions
- Performance issues acknowledged but deferred
- Known limitations or shortcuts
- Code that needs refactoring
- Missing error handling
- Hardcoded values that should be configurable
- Missing tests or incomplete coverage
- Security considerations deferred
- Deprecated dependencies or patterns

**Enhancement Indicators:**
- "Nice to have" features
- Future feature ideas
- Improvement suggestions
- User experience enhancements
- Performance optimizations (proactive, not reactive)
- New integrations or capabilities
- Extended functionality
- Quality of life improvements
- Scalability considerations

### Phase 2: Extract and Classify Items

For each identified item, extract:

1. **Type**: `debt` or `enhancement`
2. **Title**: A concise, descriptive title (5-10 words)
3. **Summary**: A brief summary capturing:
   - What was discussed
   - Why it was mentioned
   - The context/reasoning from the conversation
   - Any specific files, components, or areas mentioned
4. **Priority** (optional): If discussed, note the priority level (low/medium/high)
5. **Related Files**: Any specific files or components mentioned

### Phase 3: Ensure Documentation Files Exist

**Check for docs directory**

- Verify `docs/` directory exists at project root
- If not, create it

**Check for technical-debt.md**

- Verify `docs/technical-debt.md` exists
- If not, create it with the template below

**Check for enhancements.md**

- Verify `docs/enhancements.md` exists
- If not, create it with the template below

### Phase 4: Append Classified Items

**Format for each item:**

Use this exact markdown format for each classified item, using the `CURRENT_DATE` value obtained in Phase 0:

```markdown
### [Title]

- **Date**: [CURRENT_DATE from Phase 0]
- **Priority**: [Low/Medium/High] (if known)
- **Related Files**: [file paths or "N/A"]

**Context**: [2-3 sentence summary of the conversation context and why this was flagged]

---
```

**IMPORTANT**: Always use the exact date string returned from the `date +%Y-%m-%d` command in Phase 0. Do not guess or assume the date.

**Append items to appropriate file:**

- Technical debt items → `docs/technical-debt.md`
- Enhancement items → `docs/enhancements.md`

Add new items at the end of the file, before any closing sections.

### Phase 5: Report Summary

Output a summary of classified items:

```markdown
## Classification Complete

### Technical Debt Items Added: [count]
[List titles]

### Enhancement Items Added: [count]
[List titles]

### Files Updated
- docs/technical-debt.md
- docs/enhancements.md
```

## File Templates

### docs/technical-debt.md Template

```markdown
# Technical Debt

This document tracks technical debt identified during development conversations. Items here represent known limitations, workarounds, or areas that need future attention.

## How to Use This Document

- Review periodically during sprint planning
- Consider addressing high-priority items before new features
- Update status when items are resolved (move to "Resolved" section)

---

## Active Items

<!-- New items are added here -->

---

## Resolved Items

<!-- Move items here when addressed, with resolution date -->
```

### docs/enhancements.md Template

```markdown
# Future Enhancements

This document tracks enhancement ideas and feature suggestions identified during development conversations. Items here represent opportunities for improvement that aren't part of current work.

## How to Use This Document

- Review during roadmap planning
- Use as inspiration for future sprints
- Move to specs/ when ready to implement

---

## Ideas

<!-- New items are added here -->

---

## Implemented

<!-- Move items here when implemented, with implementation date -->
```

## Classification Guidelines

### What IS Technical Debt

- Explicit mentions of "we should fix this later"
- Acknowledged shortcuts or workarounds
- Missing functionality that should exist
- Code quality concerns raised and deferred
- Performance issues noted but not addressed
- Security considerations mentioned but not implemented

### What IS an Enhancement

- "It would be nice if..."
- Feature ideas for future consideration
- Optimization opportunities (proactive)
- UX improvements suggested
- New integrations discussed
- Extended capabilities mentioned

### What to SKIP

- Completed work (already implemented)
- Questions without actionable items
- Clarifications or explanations
- Generic best practices mentioned in passing
- Items already tracked elsewhere (issues, tasks.md, etc.)

## Notes

- **ALWAYS run `date +%Y-%m-%d` first** to get the current date - never assume or guess the year
- Use the exact date returned from the shell command for all items
- Keep summaries concise but informative (2-3 sentences)
- Include file paths when specifically mentioned
- Don't duplicate items already in the document
- If unsure about classification, default to enhancement (debt requires clear acknowledgment of a problem)

