export function createReactDiagnosticsAdapter({ onRecoverableError } = {}) {
  if (
    onRecoverableError !== undefined &&
    typeof onRecoverableError !== "function"
  )
    throw new TypeError("onRecoverableError must be a function.");

  return {
    onRecoverableError(error, info = {}) {
      const diagnostic = {
        category: "react-recoverable-error",
        message: error instanceof Error ? error.message : String(error),
        componentStack:
          typeof info.componentStack === "string" ? info.componentStack : null,
      };
      onRecoverableError?.(diagnostic);
    },
  };
}
