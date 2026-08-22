import { publicErrorMessage } from "@/lib/http/errors";

export function jsonError(error: unknown): Response {
  const { status, error: message } = publicErrorMessage(error);
  return Response.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function toHonoResponse(response: Response) {
  return response;
}
