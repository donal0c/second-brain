// =============================================================================
// Taxonomy Configuration
// =============================================================================
// Defines the organizational structure for categorizing entities.
// Start minimal. Expand only when pain appears.

export interface TaxonomyArea {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface TaxonomyDomain {
  id: string;
  name: string;
  description?: string;
  areas: string[]; // Area IDs
}

export interface TaxonomyConfig {
  domains: TaxonomyDomain[];
  areas: TaxonomyArea[];
}

// =============================================================================
// Default Taxonomy (Starter Set)
// =============================================================================

export const DEFAULT_WORK_AREAS: TaxonomyArea[] = [
  { id: "projects", name: "Projects", description: "Active work projects" },
  { id: "admin", name: "Admin", description: "Administrative tasks" },
  { id: "learning", name: "Learning", description: "Professional development" },
  { id: "meetings", name: "Meetings", description: "Meeting notes and follow-ups" },
  { id: "work-ideas", name: "Ideas", description: "Work-related ideas and brainstorms" },
];

export const DEFAULT_PERSONAL_AREAS: TaxonomyArea[] = [
  { id: "family", name: "Family", description: "Family-related tasks and notes" },
  { id: "health", name: "Health", description: "Health and wellness" },
  { id: "finance", name: "Finance", description: "Financial tasks and tracking" },
  { id: "home", name: "Home", description: "Household and maintenance" },
  { id: "hobbies", name: "Hobbies", description: "Personal interests and hobbies" },
  { id: "personal-ideas", name: "Ideas", description: "Personal ideas and reflections" },
];

export const DEFAULT_DOMAINS: TaxonomyDomain[] = [
  {
    id: "work",
    name: "Work",
    description: "Professional responsibilities and projects",
    areas: DEFAULT_WORK_AREAS.map((a) => a.id),
  },
  {
    id: "personal",
    name: "Personal",
    description: "Personal life and responsibilities",
    areas: DEFAULT_PERSONAL_AREAS.map((a) => a.id),
  },
];

export const DEFAULT_TAXONOMY: TaxonomyConfig = {
  domains: DEFAULT_DOMAINS,
  areas: [...DEFAULT_WORK_AREAS, ...DEFAULT_PERSONAL_AREAS],
};

/**
 * Get an area by ID
 */
export function getArea(
  taxonomy: TaxonomyConfig,
  areaId: string
): TaxonomyArea | undefined {
  return taxonomy.areas.find((a) => a.id === areaId);
}

/**
 * Get a domain by ID
 */
export function getDomain(
  taxonomy: TaxonomyConfig,
  domainId: string
): TaxonomyDomain | undefined {
  return taxonomy.domains.find((d) => d.id === domainId);
}

/**
 * Get all areas for a domain
 */
export function getAreasForDomain(
  taxonomy: TaxonomyConfig,
  domainId: string
): TaxonomyArea[] {
  const domain = getDomain(taxonomy, domainId);
  if (!domain) return [];
  return taxonomy.areas.filter((a) => domain.areas.includes(a.id));
}
