export type SessionItem = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export type SourceItem = {
  rank?: number
  source?: string
  source_type?: string | null
  snippet?: string
  type?: string
  upload_id?: string
  filename?: string
  mime_type?: string
  url?: string
  status?: string
}

export type MessageItem = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: SourceItem[] | null
  created_at: string
}

export type UploadItem = {
  id: string
  session_id: string
  original_filename: string
  mime_type: string
  status: string
  processing_error?: string | null
  trace_id?: string | null
  url: string
  parse: Record<string, unknown>
  verify?: Record<string, unknown> | null
  created_at: string
}

export type UnsplashIntent = {
  show_images: boolean
  keyword: string
}

export type UnsplashPhoto = {
  id: string
  url: string
  thumb_url: string
  alt: string
  photographer: string
  photographer_url: string
  unsplash_url: string
}

export type AgentStep = {
  key: string
  label: string
  status?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || ""
const AUTH_EXPIRED_MESSAGE = "Your sign-in session expired. Please refresh or sign in again."

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

async function parseResponse(response: Response) {
  const text = await response.text()
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { detail: text }
  }
  if (!response.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? (data as { detail?: unknown }).detail
        : response.statusText
    const message = response.status === 401
      ? AUTH_EXPIRED_MESSAGE
      : typeof detail === "string" ? detail : JSON.stringify(detail)
    throw new ApiError(message, response.status)
  }
  return data
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function getJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: {
      Accept: "application/json",
      ...authHeaders(token),
    },
  })
  return (await parseResponse(response)) as T
}

export async function postJson<T>(
  path: string,
  body: unknown,
  token: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
    signal,
  })
  return (await parseResponse(response)) as T
}

export async function postPublicJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  return (await parseResponse(response)) as T
}

export async function deleteJson(path: string, token: string) {
  const response = await fetch(apiUrl(path), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...authHeaders(token),
    },
  })
  if (response.status === 204) return {}
  return parseResponse(response)
}

export async function uploadFiles(
  sessionId: string,
  files: File[],
  context: string,
  token: string
): Promise<UploadItem[]> {
  const form = new FormData()
  form.append("context", context)
  files.forEach((file) => form.append("files", file))
  const response = await fetch(apiUrl(`/sessions/${sessionId}/uploads`), {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  })
  return (await parseResponse(response)) as UploadItem[]
}

export async function fetchAuthedBlob(path: string, token: string): Promise<string> {
  const response = await fetch(apiUrl(path), {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(response.statusText || "File fetch failed")
  }
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export { AUTH_EXPIRED_MESSAGE }
