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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || ""

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
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
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
  token: string
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
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
