# Adversarial review — 0.18.0 browser guard candidates

- **False positives outside render:** A `typeof` guard can be safe feature detection in an event handler or utility. The rule is labeled candidate and its explanation states timing cannot be inferred.
- **False positives from lookalike text:** AST matching requires a unary `typeof` applied directly to one of three identifiers; comments, strings, `process`, and longer unrelated names are excluded.
- **Location and privacy:** The report points to the AST expression and stores only a fixed evidence label, not the source snippet or compared branch values.
- **Residual limit:** Parenthesized or indirect aliases are not resolved, and this does not identify the guard’s render context.
