import { z } from "zod";

// =============================================================================
// Taxonomy Types
// =============================================================================
// These define the organizational structure for categorizing entities.
// Designed to be minimal and expandable based on user needs.

// --- Area (Life Area / Context) ---
// Areas are broad categories of life/work where tasks and projects belong.
export const AreaSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

export type Area = z.infer<typeof AreaSchema>;

// --- Domain ---
// Domains are top-level groupings of areas (e.g., "Work", "Personal", "Health")
export const DomainSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  areas: z.array(z.string()), // Area IDs
});

export type Domain = z.infer<typeof DomainSchema>;

// --- Taxonomy Config ---
// The complete taxonomy configuration
export const TaxonomyConfigSchema = z.object({
  domains: z.array(DomainSchema),
  areas: z.array(AreaSchema),
});

export type TaxonomyConfig = z.infer<typeof TaxonomyConfigSchema>;

// =============================================================================
// Default Taxonomy (Starter Set)
// =============================================================================
// Start minimal. Expand only when pain appears.

export const DEFAULT_AREAS: Area[] = [
  { id: "work", name: "Work", description: "Professional responsibilities" },
  { id: "personal", name: "Personal", description: "Personal life and errands" },
  { id: "health", name: "Health", description: "Physical and mental health" },
  { id: "learning", name: "Learning", description: "Education and skill development" },
  { id: "relationships", name: "Relationships", description: "People and social connections" },
];

export const DEFAULT_DOMAINS: Domain[] = [
  {
    id: "life",
    name: "Life",
    description: "All areas of life",
    areas: ["work", "personal", "health", "learning", "relationships"],
  },
];

export const DEFAULT_TAXONOMY: TaxonomyConfig = {
  domains: DEFAULT_DOMAINS,
  areas: DEFAULT_AREAS,
};
