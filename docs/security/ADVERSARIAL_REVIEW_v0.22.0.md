# Adversarial review — 0.22.0 exact rule suppressions

- **Overbroad suppression:** The parser accepts only two exact directive forms, line-local placement, and a fixed set of rule IDs. Wildcards, unknown IDs, malformed syntax, and disable-all directives have no effect.
- **Boundary bleed:** Same-line directives apply only to findings whose AST location starts on the comment line. A neighboring line is explicitly tested to remain visible. Next-line directives target exactly the line after the comment; they do not open persistent suppression scopes.
- **Text spoofing:** Directives are read from parser comment nodes, so string/template contents cannot suppress findings.
- **Parser and schema behavior:** Parse errors are generated before suppression and remain visible. The TypeScript parser must expose comments explicitly; the test caught and fixed this configuration gap. SARIF also maps the browser-guard rule to a stable ID and carries the suppression count. The additive count reports how many candidate nodes were suppressed without echoing source/comment text.
- **Residual limit:** Suppression can hide a real candidate if misapplied. Keep comments narrow and use runtime evidence; suppression does not alter source or claim the code is safe.
