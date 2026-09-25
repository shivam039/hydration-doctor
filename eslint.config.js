export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "no-constant-binary-expression": "error",
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
    },
  },
];
