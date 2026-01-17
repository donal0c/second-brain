# Search Quality Verification Prompt

You are a QA engineer verifying the search functionality of Second Brain.

## Test Scenario

The search system should:
1. Find relevant entities across all types (tasks, projects, ideas, persons)
2. Rank results by relevance
3. Support natural language queries
4. Handle partial matches and typos gracefully

## Verification Criteria

### Relevance
1. Does the top result match the search intent?
2. Are highly relevant results ranked above less relevant ones?
3. Is the relevance score appropriate for the match quality?
4. Are false positives minimized?

### Recall
1. Are all relevant items returned?
2. Are partial matches included when appropriate?
3. Does context search work (searching within descriptions)?
4. Are related items surfaced?

### Query Understanding
1. Are natural language queries interpreted correctly?
2. Is "my tasks for today" understood as a temporal filter?
3. Is "what's due this week" correctly interpreted?
4. Are entity-type filters working ("show me all projects")?

### Edge Cases
1. Empty query returns reasonable results (or empty state)
2. Very long queries are handled
3. Special characters don't break search
4. Unicode/emoji queries work

## Test Cases

### Case 1: Exact Match
**Query**: "Q4 marketing campaign"
**Data**: Project with name "Q4 Marketing Campaign Planning"
**Expected**: Project appears as top result with high relevance

### Case 2: Partial Match
**Query**: "marketing"
**Data**: Multiple items mentioning marketing
**Expected**: All marketing-related items returned, sorted by relevance

### Case 3: Cross-Entity Search
**Query**: "Sarah"
**Data**: Person "Sarah Chen", Task "Call Sarah about meeting"
**Expected**: Both results returned, person potentially ranked higher

### Case 4: Natural Language
**Query**: "what do I need to do for the website project"
**Data**: Tasks linked to "Website Redesign" project
**Expected**: Tasks from that project returned

### Case 5: Typo Tolerance
**Query**: "marketting campain"
**Expected**: Still returns marketing campaign results

### Case 6: Empty Results
**Query**: "xyznonexistent123"
**Expected**: Empty results with helpful empty state message

## Response Format

```json
{
  "case_id": "1",
  "query": "...",
  "data_context": "Description of test data",
  "expected_top_result": "...",
  "actual_top_result": "...",
  "relevance_correct": true|false,
  "recall_complete": true|false,
  "false_positives": [],
  "missing_results": [],
  "ranking_issues": [],
  "overall_pass": true|false,
  "notes": "..."
}
```
