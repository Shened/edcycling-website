import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts", "types/database.ts"] },
  {
    rules: {
      // O site usa <img> de propósito (imagens do Supabase Storage com URLs assinados).
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
