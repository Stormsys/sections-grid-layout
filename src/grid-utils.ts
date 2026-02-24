/**
 * Pure utility functions for CSS Grid area parsing and section management.
 */

/**
 * Parse a grid-template-areas string and return all unique named areas.
 * Excludes "." (unnamed cell) and empty strings.
 */
export function detectAllGridAreas(areasString: string | undefined): string[] {
  if (!areasString) return [];
  const found = new Set<string>();
  for (const line of areasString.split("\n").map(l => l.trim()).filter(Boolean)) {
    for (const area of line.replace(/['"]/g, "").split(/\s+/)) {
      if (area !== "." && area !== "") found.add(area);
    }
  }
  return Array.from(found);
}

/**
 * Convert a kebab-case or snake_case area name to Title Case.
 * e.g. "footer-right" → "Footer Right", "main_content" → "Main Content"
 */
export function formatAreaName(area: string): string {
  return area.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Ensure every grid area has a corresponding section config.
 * Returns a new array with auto-created sections appended for missing areas.
 */
export function ensureSectionsForAllAreas(
  allGridAreas: string[],
  sections: any[]
): any[] {
  if (!allGridAreas.length) return sections || [];
  const result = [...(sections || [])];
  const existing = new Set(result.map(s => s.grid_area).filter(Boolean));
  for (const area of allGridAreas) {
    if (!existing.has(area)) {
      result.push({ type: "grid", title: formatAreaName(area), grid_area: area, cards: [] });
    }
  }
  return result;
}
