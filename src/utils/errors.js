export class DoctorError extends Error {
  constructor(message, { exitCode = 2, cause } = {}) {
    super(message, { cause });
    this.name = "DoctorError";
    this.exitCode = exitCode;
  }
}

export function getExitCode(error) {
  return Number.isInteger(error?.exitCode) ? error.exitCode : 2;
}
