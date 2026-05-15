"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Leaf, MessageSquare, Sprout, LogOut, Sparkles, ArrowRight,
  Cpu, Loader2, Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { PrakritiQuiz } from "@/components/prakriti/prakriti-quiz";
import { PrakritiResults } from "@/components/prakriti/prakriti-results";
import { PrakritiHistory } from "@/components/prakriti/prakriti-history";
import { quizQuestions, type Dosha, type QuizQuestion } from "@/lib/prakriti-data";
import {
  saveQuizResult, getQuizHistory, type QuizHistoryEntry,
} from "@/lib/quiz-history";

const SandParticles = dynamic(
  () => import("@/components/chat/sand-particles").then((mod) => mod.SandParticles),
  { ssr: false }
);

type Stage = "intro" | "quiz" | "results";

const aiFocusOptions = [
  { value: "general", label: "General", icon: "🧬" },
  { value: "emotional", label: "Emotional & Mental", icon: "🧠" },
  { value: "physical", label: "Physical Traits", icon: "💪" },
  { value: "lifestyle", label: "Lifestyle & Habits", icon: "🌿" },
  { value: "relationships", label: "Relationships", icon: "💞" },
  { value: "career", label: "Work & Career", icon: "⚡" },
];

export default function PrakritiPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<Record<number, Dosha>>({});
  const [quizMode, setQuizMode] = useState<"classic" | "ai-generated">("classic");
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(quizQuestions);
  const [history, setHistory] = useState<QuizHistoryEntry[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiFocus, setAiFocus] = useState("general");

  // Load history on mount
  useEffect(() => {
    setHistory(getQuizHistory());
  }, []);

  const refreshHistory = useCallback(() => {
    setHistory(getQuizHistory());
  }, []);

  const handleComplete = (ans: Record<number, Dosha>) => {
    setAnswers(ans);
    saveQuizResult(ans, quizMode);
    refreshHistory();
    setStage("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetake = () => {
    setAnswers({});
    setActiveQuestions(quizQuestions);
    setQuizMode("classic");
    setStage("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewHistoryResult = (entry: QuizHistoryEntry) => {
    setAnswers(entry.answers);
    setQuizMode(entry.mode);
    setStage("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startClassicQuiz = () => {
    setActiveQuestions(quizQuestions);
    setQuizMode("classic");
    setAiError("");
    setStage("quiz");
  };

  const startAiQuiz = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 12, focus: aiFocus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate quiz");
      }
      const data = await res.json();
      if (!data.questions?.length) throw new Error("No questions generated");
      setActiveQuestions(data.questions);
      setQuizMode("ai-generated");
      setStage("quiz");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {stage === "quiz" && (
        <div className="fixed inset-0 z-0"><SandParticles /></div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
          <Link href="/chat" className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-ayur-gold" />
            <span className="font-display text-lg tracking-tight">Vaidya</span>
            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/chat" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <MessageSquare className="w-3.5 h-3.5" />Chat
            </Link>
            <Link href="/plants" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <Sprout className="w-3.5 h-3.5" />Herbarium
            </Link>
            <span className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-ayur-gold bg-ayur-gold/10">
              <Sparkles className="w-3.5 h-3.5" />Prakriti
            </span>
            <button onClick={() => { localStorage.removeItem("vaidya_auth"); router.push("/"); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* === INTRO === */}
      {stage === "intro" && (
        <div className="relative overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />

          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-20 pb-8 relative">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
                <span className="w-8 h-px bg-foreground/20" />Discover Your Nature<span className="w-8 h-px bg-foreground/20" />
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.92] mb-6">
                Know your<br /><span className="text-muted-foreground">Prakriti.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-12 leading-relaxed">
                Prakriti is your unique Ayurvedic constitution — the blueprint of your body, mind, and spirit determined at birth.
              </p>

              {/* Dosha preview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <div className="glass-card rounded-2xl p-5 text-left hover:border-blue-400/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-blue-400/15 flex items-center justify-center mb-3"><span className="text-lg">💨</span></div>
                  <h3 className="text-sm font-display text-blue-400 mb-1">Vata</h3>
                  <p className="text-xs text-muted-foreground">Air + Space · Creative, quick, changeable</p>
                </div>
                <div className="glass-card rounded-2xl p-5 text-left hover:border-red-400/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-red-400/15 flex items-center justify-center mb-3"><span className="text-lg">🔥</span></div>
                  <h3 className="text-sm font-display text-red-400 mb-1">Pitta</h3>
                  <p className="text-xs text-muted-foreground">Fire + Water · Sharp, driven, intense</p>
                </div>
                <div className="glass-card rounded-2xl p-5 text-left hover:border-green-400/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-green-400/15 flex items-center justify-center mb-3"><span className="text-lg">🌊</span></div>
                  <h3 className="text-sm font-display text-green-400 mb-1">Kapha</h3>
                  <p className="text-xs text-muted-foreground">Earth + Water · Calm, strong, nurturing</p>
                </div>
              </div>

              {/* Two quiz modes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-6">
                {/* Classic Quiz */}
                <button
                  onClick={startClassicQuiz}
                  className="glass-card rounded-2xl p-6 text-left hover:border-ayur-gold/30 hover:bg-white/[0.03] transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-ayur-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-ayur-gold" />
                  </div>
                  <h3 className="text-base font-display mb-1 group-hover:text-ayur-gold transition-colors">Classic Assessment</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">18 curated questions based on classical Ayurvedic methodology.</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground/50 font-mono">
                    <span>18 questions</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>~3 min</span>
                  </div>
                </button>

                {/* AI Quiz */}
                <div className="glass-card rounded-2xl p-6 text-left hover:border-purple-400/30 hover:bg-white/[0.03] transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-purple-400/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Cpu className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-base font-display mb-1 group-hover:text-purple-400 transition-colors">AI-Generated Quiz</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">Unique questions created by AI, tailored to a focus area.</p>

                  {/* Focus selector */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {aiFocusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={(e) => { e.stopPropagation(); setAiFocus(opt.value); }}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono transition-all ${
                          aiFocus === opt.value
                            ? "bg-purple-400/20 text-purple-300 border border-purple-400/30"
                            : "bg-white/[0.03] text-muted-foreground/60 border border-transparent hover:bg-white/[0.06]"
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={startAiQuiz}
                    disabled={aiLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating questions...</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" />Generate Quiz</>
                    )}
                  </button>

                  {aiError && (
                    <p className="text-[10px] text-red-400 mt-2">{aiError}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground/50 font-mono">
                    <span>12 questions</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>~2 min</span>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="max-w-3xl mx-auto mt-16 mb-12">
                <h2 className="text-2xl font-display text-center mb-10">How it works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl glass-card-strong flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-display text-ayur-gold">01</span>
                    </div>
                    <h3 className="text-sm font-medium mb-2">Answer Questions</h3>
                    <p className="text-xs text-muted-foreground">Classic or AI-generated questions about your traits and tendencies.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl glass-card-strong flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-display text-ayur-gold">02</span>
                    </div>
                    <h3 className="text-sm font-medium mb-2">Get Your Prakriti</h3>
                    <p className="text-xs text-muted-foreground">See your Vata-Pitta-Kapha ratio with detailed analysis.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl glass-card-strong flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-display text-ayur-gold">03</span>
                    </div>
                    <h3 className="text-sm font-medium mb-2">Personalized Plan</h3>
                    <p className="text-xs text-muted-foreground">Diet, lifestyle tips, and herb recommendations for your dosha.</p>
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div className="max-w-xl mx-auto mt-8 pb-24">
                <PrakritiHistory
                  history={history}
                  onViewResult={handleViewHistoryResult}
                  onRefresh={refreshHistory}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === QUIZ === */}
      {stage === "quiz" && (
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-56px)] py-12">
          <PrakritiQuiz questions={activeQuestions} onComplete={handleComplete} />
        </div>
      )}

      {/* === RESULTS === */}
      {stage === "results" && (
        <div className="py-12">
          <PrakritiResults answers={answers} onRetake={handleRetake} />
        </div>
      )}
    </div>
  );
}
