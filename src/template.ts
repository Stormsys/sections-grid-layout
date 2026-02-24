/**
 * Pure template evaluation functions.
 * These handle the Jinja-like DSL used in custom_css, overlay content,
 * and background_image fields.
 */

export interface HassStates {
  [entityId: string]: {
    state: string;
    attributes?: Record<string, any>;
  } | undefined;
}

/**
 * Evaluate Jinja-like templates in a CSS string against HA state.
 * Supports: {{ states('...') }}, {{ state_attr('...', '...') }},
 * {% if is_state('...', '...') %}...{% endif %},
 * {% if not is_state('...', '...') %}...{% endif %}
 */
export function evaluateCssTemplates(
  css: string,
  states: HassStates,
  trackedEntities?: Set<string>
): string {
  if (!css) return css;
  if (!css.includes("{{") && !css.includes("{%")) return css;
  try {
    let out = css;
    out = out.replace(
      /\{%\s*if\s+is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
      (_, eid, expected, content) => {
        trackedEntities?.add(eid);
        return states[eid]?.state === expected ? content : "";
      }
    );
    out = out.replace(
      /\{%\s*if\s+not\s+is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
      (_, eid, expected, content) => {
        trackedEntities?.add(eid);
        return states[eid]?.state !== expected ? content : "";
      }
    );
    out = out.replace(/\{\{\s*states\(['"]([^'"]+)['"]\)\s*\}\}/g, (m, eid) => {
      trackedEntities?.add(eid);
      return states[eid]?.state ?? m;
    });
    out = out.replace(
      /\{\{\s*state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*\}\}/g,
      (m, eid, attr) => {
        trackedEntities?.add(eid);
        const val = states[eid]?.attributes?.[attr];
        return val !== undefined ? val : m;
      }
    );
    return out;
  } catch {
    return css;
  }
}

/**
 * Evaluate templates in overlay content strings.
 * Supports: {{ states('...') }}, {{ state_attr('...', '...') }}
 */
export function evaluateOverlayContent(content: string, states: HassStates): string {
  if (!content) return content || "";
  if (!content.includes("{{")) return content;
  let out = content;
  out = out.replace(/\{\{\s*states\(['"]([^'"]+)['"]\)\s*\}\}/g, (m, eid) => {
    return states[eid]?.state ?? m;
  });
  out = out.replace(
    /\{\{\s*state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*\}\}/g,
    (m, eid, attr) => {
      const val = states[eid]?.attributes?.[attr];
      return val !== undefined ? String(val) : m;
    }
  );
  return out;
}

/**
 * Extract entity IDs from template strings for tracking.
 * Returns all entity IDs found in is_state(), states(), state_attr() calls.
 */
export function extractEntitiesFromTemplate(str: string): string[] {
  if (!str) return [];
  const entities = new Set<string>();
  for (const re of [
    /is_state\(['"]([^'"]+)['"]/g,
    /states\(['"]([^'"]+)['"]/g,
    /state_attr\(['"]([^'"]+)['"]/g,
  ]) {
    let m;
    while ((m = re.exec(str)) !== null) entities.add(m[1]);
  }
  return Array.from(entities);
}
