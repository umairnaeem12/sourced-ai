type Level = "info" | "warn" | "error";

// Structured JSON on stderr. Never pass secrets or full request bodies in fields.
function write(level: Level, message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else console.warn(line);
}

export const logger = {
  info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields),
};
