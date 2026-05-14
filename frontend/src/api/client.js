const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function apiUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export function apiUrlWithOwner(path, ownerToken) {
  const url = apiUrl(path);
  if (!ownerToken || !url) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}owner_token=${encodeURIComponent(ownerToken)}`;
}

async function parseResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    let msg = data.detail ?? res.statusText ?? "Request failed";
    if (Array.isArray(msg)) {
      msg = msg.map((e) => e.msg || JSON.stringify(e)).join("; ");
    }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

export async function getJson(path, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json", ...extraHeaders },
  });
  return parseResponse(res);
}

export async function postJson(path, body, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function deleteJson(path, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { Accept: "application/json", ...extraHeaders },
  });
  return parseResponse(res);
}

/**
 * @param {string} sessionId
 * @param {File[]} files
 */
export async function postSessionUploads(sessionId, files, context = "", extraHeaders = {}) {
  const fd = new FormData();
  fd.append("context", context || "");
  for (const f of files) {
    fd.append("files", f);
  }
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/uploads`, {
    method: "POST",
    headers: extraHeaders,
    body: fd,
  });
  return parseResponse(res);
}
