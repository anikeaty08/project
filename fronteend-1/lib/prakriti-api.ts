import { getJson, postJson, deleteJson } from "./rag-api";

export interface PrakritiResultResponse {
  id: string;
  mode: string;
  question_count: number;
  prakriti_name: string;
  primary_dosha: string;
  secondary_dosha: string;
  vata_pct: number;
  pitta_pct: number;
  kapha_pct: number;
  answers_json: Record<string, string> | null;
  focus_area: string | null;
  created_at: string;
}

export interface SaveResultPayload {
  mode: string;
  question_count: number;
  prakriti_name: string;
  primary_dosha: string;
  secondary_dosha: string;
  vata_pct: number;
  pitta_pct: number;
  kapha_pct: number;
  answers_json?: Record<string, string> | null;
  focus_area?: string | null;
}

export interface GenerateQuizPayload {
  count?: number;
  focus?: string;
}

export interface QuizQuestion {
  id: number;
  category: string;
  question: string;
  options: { text: string; dosha: string }[];
}

// ── Quiz Generation (backend AI agent) ──

export async function generateQuiz(
  payload: GenerateQuizPayload,
  token: string
): Promise<QuizQuestion[]> {
  const data = await postJson<{ questions: QuizQuestion[] }>(
    "/prakriti/generate-quiz",
    payload,
    token
  );
  return data.questions;
}

// ── History CRUD (Postgres via backend) ──

export async function savePrakritiResult(
  payload: SaveResultPayload,
  token: string
): Promise<PrakritiResultResponse> {
  return postJson<PrakritiResultResponse>("/prakriti/results", payload, token);
}

export async function getPrakritiHistory(
  token: string
): Promise<PrakritiResultResponse[]> {
  return getJson<PrakritiResultResponse[]>("/prakriti/results", token);
}

export async function getPrakritiResult(
  id: string,
  token: string
): Promise<PrakritiResultResponse> {
  return getJson<PrakritiResultResponse>(`/prakriti/results/${id}`, token);
}

export async function deletePrakritiResult(
  id: string,
  token: string
): Promise<void> {
  await deleteJson(`/prakriti/results/${id}`, token);
}

// ── Helpers ──

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
