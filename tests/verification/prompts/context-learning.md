# Context Learning Verification Prompt

You are a QA engineer verifying the personal context learning functionality of Second Brain.

## Test Scenario

The context learning system:
1. Extracts entities (people, places, organizations, concepts) from captures
2. Builds a knowledge base of the user's personal context
3. Uses this context to improve future processing
4. Tracks mention counts and relationships

## Verification Criteria

### Entity Extraction
1. Are named entities correctly identified?
2. Is the entity type (person, place, org, concept) correct?
3. Are descriptions accurate based on the capture context?
4. Is the domain (work, personal, health, etc.) appropriate?

### Context Accumulation
1. Does mention count increase for repeated entities?
2. Are entity descriptions enriched with new information?
3. Are relationships between entities captured?
4. Is context properly scoped (not mixing personal/work)?

### Context Application
1. Is personal context correctly applied to ambiguous captures?
2. Does "Sarah" resolve to the correct person based on context?
3. Are project names and acronyms understood?
4. Is domain-specific jargon handled appropriately?

## Test Cases

### Case 1: New Person Extraction
**Input**: "Meeting with Sarah Chen from engineering about the API redesign"
**Expected**:
- Person: Sarah Chen (type: person, domain: work)
- Concept: API redesign (type: concept, domain: work)

### Case 2: Context Accumulation
**First capture**: "Sarah Chen reviewed my PR"
**Second capture**: "Sarah mentioned the deadline is Friday"
**Expected**: Sarah Chen should have mention_count = 2, enriched description

### Case 3: Disambiguation with Context
**Context**: User has Sarah Chen (work) and Sarah Wilson (family)
**Input**: "Catch up with Sarah about the kids"
**Expected**: Should associate with Sarah Wilson (family context)

### Case 4: Organization Recognition
**Input**: "Acme Corp wants to extend the contract through Q4"
**Expected**: Acme Corp recognized as organization, business domain

### Case 5: Concept Learning
**Input**: "The GTD weekly review helped me clear my inbox"
**Expected**: GTD recognized as concept (productivity methodology)

## Response Format

```json
{
  "case_id": "1",
  "input": "...",
  "expected_entities": [
    {"name": "...", "type": "...", "domain": "..."}
  ],
  "actual_entities": [...],
  "extraction_correct": true|false,
  "context_applied_correctly": true|false,
  "accumulation_working": true|false,
  "issues": ["list of any issues"],
  "overall_pass": true|false,
  "notes": "..."
}
```
