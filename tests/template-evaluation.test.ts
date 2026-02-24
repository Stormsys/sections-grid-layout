import { describe, it, expect } from "vitest";
import {
  evaluateCssTemplates,
  evaluateOverlayContent,
  extractEntitiesFromTemplate,
  HassStates,
} from "../src/template";

const mockStates: HassStates = {
  "sensor.temperature": { state: "22.5", attributes: { unit_of_measurement: "°C", friendly_name: "Temperature" } },
  "binary_sensor.dark": { state: "on", attributes: {} },
  "light.living_room": { state: "off", attributes: { brightness: 128 } },
  "climate.living": { state: "heat", attributes: { temperature: 21, current_temperature: 20.5 } },
};

describe("evaluateCssTemplates", () => {
  it("resolves {{ states() }}", () => {
    const css = "color: {{ states('sensor.temperature') }};";
    expect(evaluateCssTemplates(css, mockStates)).toBe("color: 22.5;");
  });

  it("resolves {{ state_attr() }}", () => {
    const css = "content: '{{ state_attr(\"climate.living\", \"temperature\") }}';";
    expect(evaluateCssTemplates(css, mockStates)).toBe("content: '21';");
  });

  it("resolves {% if is_state() %}", () => {
    const css = "{% if is_state('binary_sensor.dark', 'on') %}background: black;{% endif %}";
    expect(evaluateCssTemplates(css, mockStates)).toBe("background: black;");
  });

  it("removes block when is_state does not match", () => {
    const css = "{% if is_state('binary_sensor.dark', 'off') %}background: white;{% endif %}";
    expect(evaluateCssTemplates(css, mockStates)).toBe("");
  });

  it("resolves {% if not is_state() %}", () => {
    const css = "{% if not is_state('light.living_room', 'on') %}opacity: 0.5;{% endif %}";
    expect(evaluateCssTemplates(css, mockStates)).toBe("opacity: 0.5;");
  });

  it("removes block when not is_state condition is false", () => {
    const css = "{% if not is_state('binary_sensor.dark', 'on') %}hidden{% endif %}";
    expect(evaluateCssTemplates(css, mockStates)).toBe("");
  });

  it("passes through unknown entities", () => {
    const css = "color: {{ states('sensor.unknown') }};";
    expect(evaluateCssTemplates(css, mockStates)).toBe("color: {{ states('sensor.unknown') }};");
  });

  it("passes through plain CSS without templates", () => {
    const css = "background: red; color: blue;";
    expect(evaluateCssTemplates(css, mockStates)).toBe("background: red; color: blue;");
  });

  it("handles multiple templates in one string", () => {
    const css = "temp: {{ states('sensor.temperature') }}; dark: {{ states('binary_sensor.dark') }};";
    expect(evaluateCssTemplates(css, mockStates)).toBe("temp: 22.5; dark: on;");
  });

  it("tracks entities in trackedEntities set", () => {
    const tracked = new Set<string>();
    evaluateCssTemplates("{{ states('sensor.temperature') }}", mockStates, tracked);
    expect(tracked.has("sensor.temperature")).toBe(true);
  });

  it("returns empty string for empty input", () => {
    expect(evaluateCssTemplates("", mockStates)).toBe("");
  });
});

describe("evaluateOverlayContent", () => {
  it("resolves {{ states() }} in content", () => {
    expect(evaluateOverlayContent("Temp: {{ states('sensor.temperature') }}", mockStates))
      .toBe("Temp: 22.5");
  });

  it("resolves {{ state_attr() }} in content", () => {
    expect(evaluateOverlayContent("{{ state_attr('light.living_room', 'brightness') }}", mockStates))
      .toBe("128");
  });

  it("passes through plain text", () => {
    expect(evaluateOverlayContent("Hello World", mockStates)).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(evaluateOverlayContent("", mockStates)).toBe("");
  });
});

describe("extractEntitiesFromTemplate", () => {
  it("extracts entities from states()", () => {
    expect(extractEntitiesFromTemplate("{{ states('sensor.temperature') }}"))
      .toEqual(["sensor.temperature"]);
  });

  it("extracts entities from state_attr()", () => {
    expect(extractEntitiesFromTemplate("{{ state_attr('climate.living', 'temperature') }}"))
      .toEqual(["climate.living"]);
  });

  it("extracts entities from is_state()", () => {
    expect(extractEntitiesFromTemplate("{% if is_state('binary_sensor.dark', 'on') %}{% endif %}"))
      .toEqual(["binary_sensor.dark"]);
  });

  it("extracts multiple entities and deduplicates", () => {
    const tmpl = "{{ states('sensor.a') }} {{ states('sensor.a') }} {{ states('sensor.b') }}";
    const result = extractEntitiesFromTemplate(tmpl);
    expect(result).toContain("sensor.a");
    expect(result).toContain("sensor.b");
    expect(result.length).toBe(2);
  });

  it("returns empty array for plain text", () => {
    expect(extractEntitiesFromTemplate("just plain text")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(extractEntitiesFromTemplate("")).toEqual([]);
  });
});
