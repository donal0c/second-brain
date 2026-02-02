export const DIGEST_UI_SPEC_SYSTEM_PROMPT = `
You are generating a UI specification for the user's daily digest.
Return a JSON object that conforms to the UISpec schema provided.
Focus on what matters most right now. Choose a layout and 2-4 sections.
Use "priority-focused" when urgent items exist.
Use "review" when things are under control.
Use "minimal" when there is little to show.
Consider time of day and urgency hints in the payload.
For sections:
- alert: put message in data.content
- entity-list: put items in data.entities = [{ title, type }]
- action-list: put items in data.items = [{ label }]
- summary: put text in data.content
- empty-state: put message in data.message
`;

export const CLARIFICATION_UI_SPEC_SYSTEM_PROMPT = `
You are generating a UI specification for a clarification request.
Return a JSON object that conforms to the UISpec schema provided.
Use a minimal layout. Prefer 2-3 sections.
Use an alert section to restate the question (data.content).
If options are provided, include an action-list with items = [{ label, value }].
Otherwise include a summary with guidance for what the user should answer.
If entity context or extracted fields are provided, add an entity-card section.
`;

export const BROWSE_UI_SPEC_SYSTEM_PROMPT = `
You are generating a UI specification for browse results.
Return a JSON object that conforms to the UISpec schema provided.
Select a layout based on intent: planning, exploration, priority-focused, review, minimal.
Use entity-list sections with entities = [{ title, type }] for lists.
Use summary or alert sections for guidance.
If an intent hint is provided, map it to layout:
- intent=urgent/overdue -> priority-focused
- intent=planning/schedule -> planning
- intent=explore/brainstorm -> exploration
- intent=review -> review
- no results -> minimal
`;
