# Inbox Processing Verification Prompt

You are a QA engineer verifying the inbox processing functionality of a GTD (Getting Things Done) application called Second Brain.

## Test Scenario

The inbox processing system takes raw text captures and classifies them into:
- **Tasks**: Actionable items with a clear next action
- **Projects**: Multi-step outcomes requiring planning
- **Ideas**: Reference material or things to explore later
- **Persons**: Contact/relationship information

## Verification Criteria

For each test case, verify:

### Classification Accuracy
1. Is the classification (task/project/idea/person) correct for the input?
2. If ambiguous, is the classification reasonable given the context?
3. Would a human classify this the same way?

### Field Extraction
For Tasks:
- [ ] Title clearly describes the task
- [ ] Next action is specific and actionable
- [ ] Context (@home, @work, etc.) is appropriate if present
- [ ] Due date is correctly parsed if mentioned

For Projects:
- [ ] Name captures the desired outcome
- [ ] Desired outcome is clear and measurable
- [ ] Initial next action is identified

For Ideas:
- [ ] Title summarizes the concept
- [ ] Summary captures key details
- [ ] Links are extracted if present

For Persons:
- [ ] Name is correctly extracted
- [ ] Relationship context is captured
- [ ] Follow-up actions are identified

### Confidence Score
- Score should be > 0.7 for clear inputs
- Score should be < 0.5 for ambiguous inputs
- Score should reflect actual classification certainty

## Test Cases

### Case 1: Clear Task
**Input**: "Call Mom tomorrow about her birthday party"
**Expected**: Task with title about calling Mom, due date tomorrow

### Case 2: Complex Project
**Input**: "Plan the Q4 marketing campaign - need to review budget, create timeline, and coordinate with design team"
**Expected**: Project with clear outcome and first next action

### Case 3: Idea Reference
**Input**: "Interesting article about productivity: https://example.com/productivity-tips"
**Expected**: Idea with extracted link

### Case 4: Person Context
**Input**: "Met John Smith at the conference - he's the CTO at Acme Corp, should follow up about partnership"
**Expected**: Person with name, context, and follow-up action

### Case 5: Ambiguous Input
**Input**: "groceries"
**Expected**: Low confidence, likely task but unclear

## Response Format

For each test case, respond with:

```json
{
  "case_id": "1",
  "input": "...",
  "expected_classification": "task|project|idea|person",
  "actual_classification": "...",
  "classification_correct": true|false,
  "fields_correct": true|false,
  "field_issues": ["list of any issues"],
  "confidence_appropriate": true|false,
  "overall_pass": true|false,
  "notes": "Additional observations"
}
```
