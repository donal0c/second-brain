/**
 * Test Fixtures - Sample data for E2E and integration tests
 */

// =============================================================================
// Inbox Items
// =============================================================================

export const testInboxItems = {
  simple: {
    id: "inbox-test-001",
    rawText: "Call mom tomorrow about birthday plans",
    source: "web",
    status: "new" as const,
  },
  complex: {
    id: "inbox-test-002",
    rawText:
      "Meeting with John from Acme Corp next week to discuss Q4 partnership - need to prepare presentation and review last quarter's numbers",
    source: "web",
    status: "new" as const,
  },
  processed: {
    id: "inbox-test-003",
    rawText: "Buy groceries - milk, eggs, bread",
    source: "web",
    status: "processed" as const,
  },
  blocked: {
    id: "inbox-test-004",
    rawText: "This item needs clarification",
    source: "web",
    status: "blocked" as const,
    clarificationAttempts: 1,
  },
};

// =============================================================================
// Tasks
// =============================================================================

export const testTasks = {
  active: {
    id: "task-test-001",
    title: "Complete quarterly report",
    nextAction: "Draft executive summary section",
    context: "@work",
    status: "active" as const,
    needsReview: false,
  },
  withDueDate: {
    id: "task-test-002",
    title: "Submit expense report",
    nextAction: "Collect receipts from last trip",
    context: "@work",
    status: "active" as const,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    needsReview: false,
  },
  waiting: {
    id: "task-test-003",
    title: "Wait for client feedback",
    nextAction: "Follow up with Sarah on proposal",
    context: "@waiting",
    status: "waiting" as const,
    needsReview: false,
  },
  needsReview: {
    id: "task-test-004",
    title: "Review marketing strategy",
    nextAction: "Check competitor analysis",
    context: "@work",
    status: "active" as const,
    needsReview: true,
  },
};

// =============================================================================
// Projects
// =============================================================================

export const testProjects = {
  active: {
    id: "proj-test-001",
    name: "Website Redesign",
    desiredOutcome: "Launch new company website with improved UX",
    nextAction: "Finalize homepage mockups",
    status: "active" as const,
    needsReview: false,
  },
  onHold: {
    id: "proj-test-002",
    name: "Mobile App Development",
    desiredOutcome: "Release iOS and Android apps",
    nextAction: "Waiting for budget approval",
    status: "on_hold" as const,
    needsReview: false,
  },
  missingNextAction: {
    id: "proj-test-003",
    name: "Office Renovation",
    desiredOutcome: "Modernize office space",
    nextAction: null,
    status: "active" as const,
    needsReview: true,
  },
};

// =============================================================================
// Ideas
// =============================================================================

export const testIdeas = {
  simple: {
    id: "idea-test-001",
    title: "Podcast about productivity",
    summary: "Start a podcast interviewing productivity experts",
    links: [],
    needsReview: false,
  },
  withLinks: {
    id: "idea-test-002",
    title: "Learn Rust programming",
    summary: "Explore systems programming with Rust",
    links: [
      "https://doc.rust-lang.org/book/",
      "https://rustlings.cool/",
    ],
    needsReview: false,
  },
  needsReview: {
    id: "idea-test-003",
    title: "Build a home automation system",
    summary: null,
    links: [],
    needsReview: true,
  },
};

// =============================================================================
// Persons
// =============================================================================

export const testPersons = {
  colleague: {
    id: "person-test-001",
    name: "Sarah Johnson",
    relationshipContext: "Project manager at work",
    followUpNextAction: "Schedule 1:1 meeting",
    needsReview: false,
  },
  contact: {
    id: "person-test-002",
    name: "John Smith",
    relationshipContext: "Business partner at Acme Corp",
    followUpNextAction: null,
    lastTouchedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    needsReview: false,
  },
  overdueFollowUp: {
    id: "person-test-003",
    name: "Mike Wilson",
    relationshipContext: "Old college friend",
    followUpNextAction: "Catch up over coffee",
    lastTouchedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    needsReview: true,
  },
};

// =============================================================================
// Personal Contexts
// =============================================================================

export const testPersonalContexts = {
  person: {
    id: "ctx-test-001",
    name: "Sarah",
    type: "person" as const,
    description: "Project manager at work",
    domain: "work",
    mentionCount: 5,
  },
  organization: {
    id: "ctx-test-002",
    name: "Acme Corp",
    type: "organization" as const,
    description: "Business partner company",
    domain: "work",
    mentionCount: 3,
  },
  concept: {
    id: "ctx-test-003",
    name: "GTD",
    type: "concept" as const,
    description: "Getting Things Done methodology",
    domain: null,
    mentionCount: 10,
  },
};

// =============================================================================
// Full Test Scenarios
// =============================================================================

/**
 * Complete dataset for a "fresh user" scenario
 * No data, empty inbox
 */
export const emptyScenario = {
  inboxItems: [],
  tasks: [],
  projects: [],
  ideas: [],
  persons: [],
  personalContexts: [],
};

/**
 * Complete dataset for a "busy user" scenario
 * Multiple items of each type, some needing attention
 */
export const busyUserScenario = {
  inboxItems: [
    testInboxItems.simple,
    testInboxItems.complex,
    testInboxItems.blocked,
  ],
  tasks: [
    testTasks.active,
    testTasks.withDueDate,
    testTasks.waiting,
    testTasks.needsReview,
  ],
  projects: [
    testProjects.active,
    testProjects.onHold,
    testProjects.missingNextAction,
  ],
  ideas: [testIdeas.simple, testIdeas.withLinks, testIdeas.needsReview],
  persons: [
    testPersons.colleague,
    testPersons.contact,
    testPersons.overdueFollowUp,
  ],
  personalContexts: [
    testPersonalContexts.person,
    testPersonalContexts.organization,
    testPersonalContexts.concept,
  ],
};
