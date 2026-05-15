import type { Dosha } from "./prakriti-data";
import { calculateResults } from "./prakriti-data";

export interface QuizHistoryEntry {
  id: string;
  date: string;
  answers: Record<number, Dosha>;
  prakritiName: string;
  percentages: Record<Dosha, number>;
  primary: Dosha;
  mode: "classic" | "ai-generated";
  questionCount: number;
}

const STORAGE_KEY = "vaidya_prakriti_history";

// NOTE: Currently uses localStorage. To migrate to Postgres,
// replace these functions with fetch calls to your backend API
// e.g. POST /api/prakriti-history, GET /api/prakriti-history, DELETE /api/prakriti-history/:id

export function saveQuizResult(
  answers: Record<number, Dosha>,
  mode: "classic" | "ai-generated" = "classic"
): QuizHistoryEntry {
  const result = calculateResults(answers);
  const entry: QuizHistoryEntry = {
    id: `quiz-${Date.now()}`,
    date: new Date().toISOString(),
    answers,
    prakritiName: result.prakritiName,
    percentages: result.percentages,
    primary: result.primary,
    mode,
    questionCount: Object.keys(answers).length,
  };
  const history = getQuizHistory();
  history.unshift(entry);
  if (history.length > 20) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return entry;
}

export function getQuizHistory(): QuizHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteQuizEntry(id: string): void {
  const history = getQuizHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

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
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
