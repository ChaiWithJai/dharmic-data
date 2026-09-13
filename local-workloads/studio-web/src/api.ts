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
  created_by?: string;
  updated_by?: string;
  author_name?: string;
}
// Scope is immutable for this page lifecycle. Switching workspace reloads the page,
// so an in-flight save cannot inherit a different workspace header.
export const workspaceScope = (() => {
  try {
    return localStorage.getItem("imagine-together.workspace") || "";
  } catch {
    return "";
  }
})();
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
  const response = await request(path, options);
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function apiText(path: string): Promise<string> {
  return (await request(path)).text();
}
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(workspaceScope ? { "X-Workspace-ID": workspaceScope } : {}),
      ...options.headers,
    },
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
  return response;
}
export function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
