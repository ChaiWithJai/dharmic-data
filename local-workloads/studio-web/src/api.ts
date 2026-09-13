export interface Card {
  id: string;
  title: string;
  source_url: string;
  quote: string;
  note: string;
  theme: string;
  revision: number;
  created_at: string;
  updated_at: string;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    let message = await response.text();
    try {
      const parsed = JSON.parse(message);
      message = parsed.detail || parsed.error || message;
    } catch {}
    throw new ApiError(
      typeof message === "string" ? message : JSON.stringify(message),
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
