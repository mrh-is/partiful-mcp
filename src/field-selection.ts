import type { z } from "zod";

interface ZodDef {
  type: string;
  innerType?: z.ZodType;
  options?: z.ZodType[];
}

function getZodDef(schema: z.ZodType): ZodDef {
  return (schema as unknown as { _zod: { def: ZodDef } })._zod.def;
}

function hasShape(schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> {
  return "shape" in schema;
}

function unwrap(schema: z.ZodType): z.ZodType {
  const def = getZodDef(schema);
  if (
    (def.type === "optional" || def.type === "nullable" || def.type === "nonoptional") &&
    def.innerType
  ) {
    return unwrap(def.innerType);
  }
  return schema;
}

function collectPaths(schema: z.ZodType, prefix: string): string[] {
  const unwrapped = unwrap(schema);
  const def = getZodDef(unwrapped);

  if (hasShape(unwrapped)) {
    const paths: string[] = [];
    for (const key of Object.keys(unwrapped.shape)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      paths.push(fullPath);
      const childSchema = unwrap(unwrapped.shape[key] as z.ZodType);
      const childDef = getZodDef(childSchema);
      if (hasShape(childSchema) || childDef.type === "array" || childDef.type === "union") {
        paths.push(...collectPaths(childSchema, fullPath));
      }
    }
    return paths;
  }

  if (def.type === "array") {
    const element = (unwrapped as unknown as { element: z.ZodType }).element;
    return collectPaths(element, prefix);
  }

  if (def.type === "union" && def.options) {
    const merged = new Set<string>();
    for (const variant of def.options) {
      for (const path of collectPaths(variant, prefix)) {
        merged.add(path);
      }
    }
    return [...merged];
  }

  return [];
}

export function extractFieldPaths(schema: z.ZodType): string[] {
  return collectPaths(schema, "").sort();
}

export function validateFields(
  requestedFields: string[],
  validPaths: string[]
): void {
  if (validPaths.length === 0) {
    throw new Error(
      "No selectable fields available for this tool. Omit the `fields` parameter to return the full response."
    );
  }

  const validSet = new Set(validPaths);
  const invalid = [...new Set(requestedFields)].filter((f) => !validSet.has(f));

  if (invalid.length > 0) {
    throw new Error(
      `Unknown field path(s): ${invalid.join(", ")}. Available fields: ${validPaths.join(", ")}`
    );
  }
}

export function filterFields(
  data: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const grouped = new Map<string, string[]>();
  for (const field of fields) {
    const dot = field.indexOf(".");
    if (dot === -1) {
      grouped.set(field, [""]);
    } else {
      const head = field.slice(0, dot);
      const tail = field.slice(dot + 1);
      const existing = grouped.get(head);
      if (existing === undefined) {
        grouped.set(head, [tail]);
      } else {
        existing.push(tail);
      }
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, subPaths] of grouped) {
    if (!(key in data)) continue;
    const value = data[key];

    if (subPaths.some((p) => p === "")) {
      result[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map((element) =>
        element && typeof element === "object" && !Array.isArray(element)
          ? filterFields(element as Record<string, unknown>, subPaths)
          : element
      );
    } else if (value && typeof value === "object") {
      result[key] = filterFields(value as Record<string, unknown>, subPaths);
    } else {
      result[key] = value;
    }
  }
  return result;
}
