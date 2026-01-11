/**
 * Date utilities for consistent date-only comparisons.
 *
 * Problem: Date strings like "2026-01-11" are parsed as midnight UTC by JavaScript,
 * but local "today" is midnight in the user's timezone. Near timezone boundaries,
 * this causes incorrect overdue/today/tomorrow classifications.
 *
 * Solution: Parse date-only strings as local dates by extracting year/month/day
 * and constructing a Date at local midnight. This ensures consistent comparisons.
 */

export interface DueDateDisplay {
  text: string;
  color: string;
}

/**
 * Parses a date-only string (YYYY-MM-DD) as local midnight.
 * This avoids UTC timezone offset issues when comparing dates.
 */
function parseDateAsLocal(dateStr: string): Date {
  // Split the date string to extract components
  const [year, month, day] = dateStr.split("-").map(Number);
  // Construct date at local midnight (month is 0-indexed)
  return new Date(year, month - 1, day);
}

/**
 * Gets today's date at local midnight for consistent comparisons.
 */
function getLocalToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Formats a due date string into a display object with text and color.
 * Handles date-only strings (YYYY-MM-DD) by parsing them as local dates
 * to avoid timezone boundary issues.
 *
 * @param dateStr - ISO date string or date-only string (YYYY-MM-DD)
 * @returns Display object with text and tailwind color class, or null if no date
 */
export function formatDueDate(
  dateStr: string | null | undefined
): DueDateDisplay | null {
  if (!dateStr) return null;

  // Parse date string - handle both date-only (YYYY-MM-DD) and full ISO strings
  // For date-only strings, parse as local to avoid timezone issues
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const date = isDateOnly ? parseDateAsLocal(dateStr) : new Date(dateStr);

  const today = getLocalToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Compare dates at midnight boundary
  if (date < today) {
    return { text: "Overdue", color: "text-red-600" };
  }
  if (date.toDateString() === today.toDateString()) {
    return { text: "Today", color: "text-orange-600" };
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return { text: "Tomorrow", color: "text-yellow-600" };
  }
  return { text: date.toLocaleDateString(), color: "text-gray-500" };
}
