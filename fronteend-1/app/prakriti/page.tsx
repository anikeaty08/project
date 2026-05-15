"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, MessageSquare, Sprout, LogOut, Sparkles, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import { PrakritiQuiz } from "@/components/prakriti/prakriti-quiz";
import { PrakritiResults } from "@/components/prakriti/prakriti-results";
import type { Dosha } from "@/lib/prakriti-data";

const SandParticles = dynamic(
  () => import("@/components/chat/sand-particles").then((mod) => mod.SandParticles),
  { ssr: false }
);

type Stage = "intro" | "quiz" | "results";

export default function PrakritiPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<Record<number, Dosha>>({});

  const handleComplete = (ans: Record<number, Dosha>) => {
    setAnswers(ans);
    setStage("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetake = () => {
    setAnswers({});
    setStage("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* 3D background for quiz */}
      {stage === "quiz" && (
        <div className="fixed inset-0 z-0">
          <SandParticles />
        </div>
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
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </Link>
            <Link href="/plants" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <Sprout className="w-3.5 h-3.5" />
              Herbarium
            </Link>
            <span className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-ayur-gold bg-ayur-gold/10">
              <Sparkles className="w-3.5 h-3.5" />
              Prakriti
            </span>
            <button onClick={() => { localStorage.removeItem("vaidya_auth"); router.push("/"); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Intro */}
      {stage === "intro" && (
        <div className="relative overflow-hidden">
          {/* Ambient blobs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />

          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-20 pb-16 relative">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
                <span className="w-8 h-px bg-foreground/20" />
                Discover Your Nature
                <span className="w-8 h-px bg-foreground/20" />
              </span>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.92] mb-6">
                Know your
                <br />
                <span className="text-muted-foreground">Prakriti.</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-12 leading-relaxed">
                Prakriti is your unique Ayurvedic constitution — the blueprint of your body, mind, and spirit determined at birth. Understanding it is the key to personalized wellness.
              </p>

              {/* Dosha preview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <div className="glass-card rounded-2xl p-5 text-left hover:border-blue-400/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-blue-400/15 flex items-center justify-center mb-3">
                    <span className="text-lg">💨</span>
                  </div>
                  <h3 className="text-sm font-display text-blue-400 mb-1">Vata</h3>
                  <p className="text-xs text-muted-foreground">Air + Space · Creative, quick, changeable</p>
                </div>
                <div className="glass-card rounded-2xl p-5 text-left hover:border-red-400/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-red-400/15 flex items-center justify-center mb-3">
                    <span className="text-lg">🔥</span>
                  </div>
                  <h3 className="text-sm font-display text-red-400 mb-1">Pitta</h3>
                  <p className="text-xs text-muted-foreground">Fire + Water · Sharp, driven, intense</p>
                </div>
                <div className="glass-card rounded-2xl p-5 text-left hover:border-green-400/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-green-400/15 flex items-center justify-center mb-3">
                    <span className="text-lg">🌊</span>
                  </div>
                  <h3 className="text-sm font-display text-green-400 mb-1">Kapha</h3>
                  <p className="text-xs text-muted-foreground">Earth + Water · Calm, strong, nurturing</p>
                </div>
              </div>

              <button
                onClick={() => setStage("quiz")}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-ayur-gold text-background text-base font-medium hover:bg-ayur-amber transition-all duration-300 shadow-lg shadow-ayur-gold/20 hover:shadow-ayur-gold/30 group"
              >
                Begin Assessment
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground/50 font-mono">
                <span>18 questions</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>~3 minutes</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>Instant results</span>
              </div>
            </div>
          </div>

          {/* How it works section */}
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 relative">
            <h2 className="text-2xl font-display text-center mb-12">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl glass-card-strong flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-display text-ayur-gold">01</span>
                </div>
                <h3 className="text-sm font-medium mb-2">Answer Questions</h3>
                <p className="text-xs text-muted-foreground">18 carefully crafted questions about your physical traits, mental tendencies, and lifestyle.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl glass-card-strong flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-display text-ayur-gold">02</span>
                </div>
                <h3 className="text-sm font-medium mb-2">Get Your Prakriti</h3>
                <p className="text-xs text-muted-foreground">Receive your unique Vata-Pitta-Kapha ratio with detailed constitution analysis.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl glass-card-strong flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-display text-ayur-gold">03</span>
                </div>
                <h3 className="text-sm font-medium mb-2">Personalized Plan</h3>
                <p className="text-xs text-muted-foreground">Get tailored diet, lifestyle tips, and herb recommendations for your specific dosha.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz */}
      {stage === "quiz" && (
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-56px)] py-12">
          <PrakritiQuiz onComplete={handleComplete} />
        </div>
      )}

      {/* Results */}
      {stage === "results" && (
        <div className="py-12">
          <PrakritiResults answers={answers} onRetake={handleRetake} />
        </div>
      )}
    </div>
  );
}
