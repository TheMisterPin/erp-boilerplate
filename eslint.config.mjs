import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";

/** Keep shadcn UI out of Next/TS rules without globally ignoring it. */
const ignoreUi = ["src/components/ui/**"];

function excludeUiFromRules(configs) {
  return configs.flatMap((config) => {
    const keys = Object.keys(config).filter((key) => key !== "name");
    // Ignore-only objects are global ignores — don't add UI there.
    if (keys.length === 1 && keys[0] === "ignores") return [config];
    if (!config.rules) return [config];

    const { rules, ...rest } = config;
    const hasSetup =
      rest.plugins != null ||
      rest.languageOptions != null ||
      rest.settings != null;

    // Keep parser/plugins for UI (so eslint-disable comments resolve), but
    // apply Next/TS rules only outside UI.
    if (hasSetup) {
      return [
        rest,
        {
          ...config,
          ignores: [...(config.ignores ?? []), ...ignoreUi],
        },
      ];
    }

    return [
      {
        ...config,
        ignores: [...(config.ignores ?? []), ...ignoreUi],
      },
    ];
  });
}

const eslintConfig = defineConfig([
  ...excludeUiFromRules(nextVitals),
  ...excludeUiFromRules(nextTs),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "better-tailwindcss": eslintPluginBetterTailwindcss,
    },
    rules: {
      // Same suggestions as Tailwind IntelliSense `suggestCanonicalClasses`,
      // with autofix so Save → Fix All applies them.
      "better-tailwindcss/enforce-canonical-classes": [
        "warn",
        { collapse: false, logical: false },
      ],
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css",
      },
    },
  },
]);

export default eslintConfig;
