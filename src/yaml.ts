/**
 * YAML serializer/parser for the section config editor.
 * These are pure functions that don't depend on DOM or HA.
 */

/**
 * Serialize a value as a YAML scalar. Quotes strings that could be
 * misinterpreted (booleans, numbers, special characters).
 */
export function yamlScalar(value: any): string {
  if (typeof value === "string") {
    if (value === "" || value === "true" || value === "false" ||
        value === "null" || value === "~" ||
        /^[\d.]+$/.test(value) || value.includes(":") ||
        value.includes("#") || value.includes("{") ||
        value.includes("[") || value.startsWith("'") ||
        value.startsWith('"') || value.startsWith("&") ||
        value.startsWith("*")) {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Serialize a section config object to YAML, skipping the "cards" key
 * (cards are managed by HA's card editor, not the section YAML editor).
 */
export function sectionConfigToYaml(config: any): string {
  const SKIP = new Set(["cards"]);
  const serialize = (obj: any, indent: number): string => {
    const pad = "  ".repeat(indent);
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (indent === 0 && SKIP.has(key)) continue;
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const inner = serialize(item, indent + 2).replace(/^\s+/, "");
            lines.push(`${pad}  - ${inner}`);
          } else {
            lines.push(`${pad}  - ${yamlScalar(item)}`);
          }
        }
      } else if (typeof value === "object") {
        lines.push(`${pad}${key}:`);
        lines.push(serialize(value, indent + 1));
      } else if (typeof value === "string" && value.includes("\n")) {
        const innerPad = "  ".repeat(indent + 1);
        lines.push(`${pad}${key}: |`);
        for (const sline of value.split("\n")) {
          lines.push(sline === "" ? "" : `${innerPad}${sline}`);
        }
      } else {
        lines.push(`${pad}${key}: ${yamlScalar(value)}`);
      }
    }
    return lines.join("\n");
  };
  return serialize(config, 0);
}

/**
 * Parse a YAML string into an object.
 * Tries window.jsyaml first (bundled by HA), falls back to a simple
 * line-based parser for flat key-value pairs.
 */
export function parseYaml(yaml: string): Record<string, any> | null {
  // Try HA's bundled js-yaml first
  try {
    const jsyaml = (typeof window !== "undefined" ? (window as any).jsyaml : undefined);
    if (jsyaml?.load) return jsyaml.load(yaml) || {};
  } catch { /* fall through */ }
  // Fallback: simple line-based parser (flat keys only)
  try {
    const result: Record<string, any> = {};
    for (const line of yaml.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx < 0) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      let val: any = trimmed.slice(colonIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else if (val === "true") { val = true; }
      else if (val === "false") { val = false; }
      else if (val !== "" && !isNaN(Number(val))) { val = Number(val); }
      if (val !== "") result[key] = val;
    }
    return result;
  } catch { return null; }
}
