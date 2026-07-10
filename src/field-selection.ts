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
