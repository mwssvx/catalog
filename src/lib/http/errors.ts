import { ZodError } from "zod";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConfigError extends Error {
  constructor(message = "Server is not configured") {
    super(message);
    this.name = "ConfigError";
  }
}

export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  constructor(message = "Invalid input") {
    super(message);
    this.name = "ValidationError";
  }
}

export function publicErrorMessage(error: unknown): { status: number; error: string } {
  if (error instanceof AuthError) return { status: 401, error: "Unauthorized" };
  if (error instanceof ForbiddenError) return { status: 403, error: "Forbidden" };
  if (error instanceof NotFoundError) return { status: 404, error: "Not found" };
  if (error instanceof ConflictError) {
    return { status: 409, error: "Board was updated elsewhere. Reload and try again." };
  }
  if (error instanceof ConfigError) {
    return { status: 503, error: "Catalog storage is not configured" };
  }
  if (error instanceof ZodError) {
    return { status: 400, error: "Invalid input" };
  }
  if (error instanceof ValidationError) {
    return { status: 400, error: error.message };
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (/invalid api key|jwt/i.test(message)) {
      return {
        status: 503,
        error:
          "Invalid Supabase API key. In Vercel use the legacy anon JWT (eyJ...), not sb_publishable_...",
      };
    }
  }
  return { status: 400, error: "Request failed" };
}
