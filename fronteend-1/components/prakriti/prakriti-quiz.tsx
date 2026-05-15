"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Leaf, Sparkles } from "lucide-react";
import { type Dosha, type QuizQuestion } from "@/lib/prakriti-data";

interface PrakritiQuizProps {
  questions: QuizQuestion[];
  onComplete: (answers: Record<number, Dosha>) => void;
}

export function PrakritiQuiz({ questions, onComplete }: PrakritiQuizProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Dosha>>({});
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const question = questions[currentQ];
  const total = questions.length;
  const progress = ((currentQ + 1) / total) * 100;
  const selectedAnswer = answers[question.id];

  const handleSelect = (dosha: Dosha) => {
    setAnswers((prev) => ({ ...prev, [question.id]: dosha }));
  };

  const handleNext = () => {
    if (!selectedAnswer) return;
    if (currentQ === total - 1) {
      onComplete(answers);
      return;
    }
    setDirection("next");
    setCurrentQ((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentQ === 0) return;
    setDirection("prev");
    setCurrentQ((p) => p - 1);
  };

  const categories = [...new Set(questions.map((q) => q.category))];
  const currentCatIndex = categories.indexOf(question.category);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-muted-foreground">
            Question {currentQ + 1} of {total}
          </span>
          <span className="text-xs font-mono text-ayur-gold">
            {question.category}
          </span>
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ayur-gold to-ayur-amber rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Category dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {categories.map((cat, i) => (
            <div
              key={cat}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentCatIndex
                  ? "w-6 bg-ayur-gold"
                  : i < currentCatIndex
                  ? "w-1.5 bg-ayur-gold/50"
                  : "w-1.5 bg-white/10"
              }`}
              title={cat}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div
        key={question.id}
        className={`transition-all duration-400 ease-out ${
          direction === "next"
            ? "animate-in fade-in slide-in-from-right-4"
            : "animate-in fade-in slide-in-from-left-4"
        }`}
      >
        <h2 className="text-2xl md:text-3xl font-display tracking-tight text-center mb-10 leading-snug">
          {question.question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, i) => {
            const isSelected = selectedAnswer === option.dosha;
            const doshaIndicator: Record<Dosha, string> = {
              vata: "border-blue-400/40 shadow-blue-400/10",
              pitta: "border-red-400/40 shadow-red-400/10",
              kapha: "border-green-400/40 shadow-green-400/10",
            };
            const doshaGlow: Record<Dosha, string> = {
              vata: "bg-blue-400/10",
              pitta: "bg-red-400/10",
              kapha: "bg-green-400/10",
            };

            return (
              <button
                key={i}
                onClick={() => handleSelect(option.dosha)}
                className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-300 group ${
                  isSelected
                    ? `${doshaIndicator[option.dosha]} ${doshaGlow[option.dosha]} shadow-lg`
                    : "border-border/30 bg-white/[0.02] hover:bg-white/[0.04] hover:border-border/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isSelected
                        ? "border-ayur-gold bg-ayur-gold"
                        : "border-border/50 group-hover:border-border"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-background" />
                    )}
                  </div>
                  <span
                    className={`text-sm leading-relaxed transition-colors ${
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {option.text}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10">
        <button
          onClick={handlePrev}
          disabled={currentQ === 0}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
            currentQ === 0
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={!selectedAnswer}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            selectedAnswer
              ? currentQ === total - 1
                ? "bg-ayur-gold text-background hover:bg-ayur-amber shadow-lg shadow-ayur-gold/20"
                : "bg-white/10 text-foreground hover:bg-white/15"
              : "bg-white/5 text-muted-foreground/30 cursor-not-allowed"
          }`}
        >
          {currentQ === total - 1 ? (
            <>
              <Sparkles className="w-4 h-4" />
              Reveal My Prakriti
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Bottom info */}
      <p className="text-center text-[10px] text-muted-foreground/40 mt-8 font-mono flex items-center justify-center gap-2">
        <Leaf className="w-3 h-3" />
        Based on classical Ayurvedic Prakriti assessment methodology
      </p>
    </div>
  );
}
