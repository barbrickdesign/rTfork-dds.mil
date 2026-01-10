/**
 * CMS Utility Functions
 * Provides helper functions for content management system operations
 */

/**
 * Formats a Date object into a readable string format
 * 
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string in "MMM DD, YYYY" format (e.g., "Jan 10, 2026")
 * @throws {TypeError} If date is not a valid Date object
 * 
 * @example
 * formatDate(new Date("2026-01-10"))
 * // returns "Jan 10, 2026"
 */
export const formatDate = (date: Date): string => {
  // Validate input
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TypeError("Invalid date provided to formatDate");
  }
  
  try {
    const ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(date);
    const mo = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
    const da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);

    return `${mo} ${da}, ${ye}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    throw error;
  }
};
