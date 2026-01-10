import { z, ZodError, ZodSchema } from "zod";

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Result type for validation operations
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/**
 * Structured validation error
 */
export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Convert Zod errors to our ValidationError format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    path: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Validate data against a Zod schema
 * Returns a discriminated union for type-safe error handling
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: formatZodErrors(result.error) };
}

/**
 * Validate data and throw if invalid
 * Use when you want exceptions rather than result types
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Check if data is valid without parsing
 */
export function isValid<T>(schema: ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}

// =============================================================================
// Common Validators
// =============================================================================

/**
 * UUID validator
 */
export const uuidSchema = z.string().uuid();

/**
 * Non-empty string validator
 */
export const nonEmptyStringSchema = z.string().min(1, "String cannot be empty");

/**
 * Confidence score validator (0-1)
 */
export const confidenceScoreSchema = z.number().min(0).max(1);

/**
 * ISO date string validator
 */
export const isoDateStringSchema = z.string().datetime();
