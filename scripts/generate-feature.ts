import { mkdir, writeFile, access } from "node:fs/promises"
import path from "node:path"
import { constants } from "node:fs"
import { pathToFileURL } from "node:url"

type Mode = "read-only" | "crud"

type FeatureNames = { singular: string; plural: string; pascal: string; route: string }

function toWords(value: string) {
  return value.trim().replace(/([a-z])([A-Z])/g, "$1 $2").split(/[\s_-]+/).filter(Boolean)
}

export function featureNames(value: string): FeatureNames {
  const words = toWords(value)
  if (words.length === 0 || !words.every((word) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(word))) {
    throw new Error("Feature name must use letters, numbers, spaces, hyphens, or underscores and start with a letter.")
  }
  const singular = words.map((word) => word.toLowerCase()).join("-").replace(/s$/, "")
  const plural = singular.endsWith("s") ? singular : `${singular}s`
  return { singular, plural, pascal: singular.split("-").map((word) => word[0]!.toUpperCase() + word.slice(1)).join(""), route: plural }
}

export function featureFiles(name: string, mode: Mode): Record<string, string> {
  const feature = featureNames(name)
  const type = feature.pascal
  const action = mode === "crud" ? `\nexport async function create${type}(): Promise<ActionResult<${type}>> {\n  throw new Error("Implement create${type} with authorize() and withErrorBoundary().")\n}\n` : ""
  return {
    [`src/features/${feature.plural}/types/${feature.singular}-types.ts`]: `export type ${type} = {\n  id: string\n  name: string\n}\n\nexport type ${type}FormValues = {\n  name: string\n}\n`,
    [`src/lib/schemas/${feature.singular}.ts`]: `import { z } from "zod"\n\nexport const ${feature.singular.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Schema = z.object({\n  name: z.string().min(1, "Required"),\n})\n`,
    [`src/features/${feature.plural}/actions/${feature.singular}-actions.ts`]: `"use server"\n\nimport type { ActionResult } from "@/features/errors/dto"\nimport type { ${type} } from "../types/${feature.singular}-types"\n\nexport async function list${type}s(): Promise<ActionResult<${type}[]>> {\n  throw new Error("Implement list${type}s with authorize() and withErrorBoundary().")\n}\n${action}`,
    [`src/features/${feature.plural}/hooks/use-${feature.singular}-list-page.tsx`]: `"use client"\n\nexport function use${type}ListPage() {\n  return { items: [], loaded: true }\n}\n`,
    [`src/features/${feature.plural}/components/forms/${feature.singular}-form-fields.ts`]: `import type { ${type}FormValues } from "../../types/${feature.singular}-types"\n\nexport const ${feature.singular.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}FormFields: Array<keyof ${type}FormValues> = ["name"]\n`,
    [`src/features/${feature.plural}/components/tables/${feature.singular}-table-columns.tsx`]: `import type { ${type} } from "../../types/${feature.singular}-types"\n\nexport function to${type}TableRow(item: ${type}) {\n  return { id: item.id, name: item.name }\n}\n`,
    [`src/features/${feature.plural}/components/pages/${feature.singular}-list-page.tsx`]: `import type { ${type} } from "../../types/${feature.singular}-types"\n\nexport function ${type}ListPage({ items }: { items: ${type}[] }) {\n  return <div>{items.length} ${feature.plural}</div>\n}\n`,
    [`src/features/${feature.plural}/index.ts`]: `export type { ${type}, ${type}FormValues } from "./types/${feature.singular}-types"\n`,
    [`src/app/(app)/${feature.route}/page.tsx`]: `"use client"\n\nimport { ${type}ListPage } from "@/features/${feature.plural}/components/pages/${feature.singular}-list-page"\nimport { use${type}ListPage } from "@/features/${feature.plural}/hooks/use-${feature.singular}-list-page"\n\nexport default function ${type}sPage() {\n  const page = use${type}ListPage()\n  return <${type}ListPage items={page.items} />\n}\n`,
    [`tests/unit/${feature.singular}-feature.test.ts`]: `import { describe, expect, it } from "vitest"\n\ndescribe("${feature.plural} feature", () => {\n  it("starts with an explicit domain contract", () => {\n    expect(true).toBe(true)\n  })\n})\n`,
  }
}

async function exists(file: string) { try { await access(file, constants.F_OK); return true } catch { return false } }

async function main() {
  const [name] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))
  const mode: Mode = process.argv.includes("--read-only") ? "read-only" : "crud"
  if (!name) throw new Error("Usage: pnpm generate:feature <name> [--read-only] [--dry-run]")
  const files = featureFiles(name, mode)
  const collisions = await Promise.all(Object.keys(files).map(async (file) => (await exists(file)) ? file : null))
  const existing = collisions.filter(Boolean)
  if (existing.length > 0) throw new Error(`Refusing to overwrite existing files:\n${existing.join("\n")}`)
  console.log(`Generate ${Object.keys(files).length} files for ${featureNames(name).plural} (${mode}).`)
  if (process.argv.includes("--dry-run")) return
  await Promise.all(Object.entries(files).map(async ([file, content]) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content) }))
  console.log("Generated. Add the Prisma model, permissions, navigation entry, server authorization, and real tests before shipping.")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Feature generation failed.")
    process.exitCode = 1
  })
}
