import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: ["api/**", ".next/**", "node_modules/**", "next-env.d.ts", "public/**"] },
];

export default config;
