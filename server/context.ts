import { AsyncLocalStorage } from "node:async_hooks";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";

export type RequestContext = {
  hono: Context;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(
  c: Context,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return requestContext.run({ hono: c }, fn);
}

export function getRequestContext(): RequestContext {
  const store = requestContext.getStore();
  if (!store) {
    throw new Error("No request context");
  }
  return store;
}

export function readCookies(): Array<{ name: string; value: string }> {
  const { hono } = getRequestContext();
  const header = hono.req.header("cookie") ?? "";
  if (!header) return [];
  return header.split(";").flatMap((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return [];
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) return [];
    return [{ name, value: decodeURIComponent(value) }];
  });
}

export function writeCookies(
  cookies: Array<{ name: string; value: string; options?: CookieOptions }>,
) {
  const { hono } = getRequestContext();
  for (const cookie of cookies) {
    setCookie(hono, cookie.name, cookie.value, cookie.options);
  }
}

export function cookieValue(name: string): string | undefined {
  const { hono } = getRequestContext();
  return getCookie(hono, name);
}
