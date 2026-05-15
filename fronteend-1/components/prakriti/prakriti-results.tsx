"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Leaf, Heart, Utensils, Activity, Sprout,
  MessageSquare, RotateCcw, AlertTriangle, Shield, Sparkles,
} from "lucide-react";
import {
  doshaProfiles, calculateResults,
  type Dosha,
} from "@/lib/prakriti-data";
import { plants } from "@/lib/plants-data";

interface PrakritiResultsProps {
  answers: Record<number, Dosha>;
  onRetake: () => void;
}

function DoshaRing({
  percentages,
  primary,
}: {
  percentages: Record<Dosha, number>;
  primary: Dosha;
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const doshas: Dosha[] = ["vata", "pitta", "kapha"];
  const colors: Record<Dosha, string> = {
    vata: "#60A5FA",
    pitta: "#F87171",
    kapha: "#4ADE80",
  };

  let offset = 0;

  return (
    <div className="relative w-52 h-52 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        {/* Background ring */}
        <circle
          cx="100" cy="100" r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16"
        />
        {/* Dosha segments */}
        {doshas.map((d) => {
          const pct = percentages[d] / 100;
          const dashLen = animated ? circumference * pct : 0;
          const dashGap = circumference - dashLen;
          const currentOffset = offset;
          offset += circumference * pct;

          return (
            <circle
              key={d}
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={colors[d]}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${dashLen} ${dashGap}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${colors[d]}40)` }}
            />
          );
        })}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-display" style={{ color: colors[primary] }}>
          {percentages[primary]}%
        </span>
        <span className="text-[10px] font-mono text-muted-foreground mt-1">
          {doshaProfiles[primary].name} dominant
        </span>
      </div>
    </div>
  );
}

export function PrakritiResults({ answers, onRetake }: PrakritiResultsProps) {
  const { percentages, primary, secondary, isDual, prakritiName } = calculateResults(answers);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => { setIsVisible(true); }, []);

  const profile = doshaProfiles[primary];
  const secondaryProfile = doshaProfiles[secondary];

  // Get recommended herbs from plants data
  const recommendedHerbs = plants.filter((p) =>
    profile.herbs.includes(p.id)
  );

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 pb-20 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${profile.bgClass} mb-6`}>
          <Sparkles className={`w-4 h-4 ${profile.colorClass}`} />
          <span className={`text-sm font-mono ${profile.colorClass}`}>Your Prakriti Revealed</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight mb-3">
          {prakritiName}
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          {profile.element} {isDual && `· ${secondaryProfile.element}`}
        </p>
        <p className="text-3xl mt-2">{profile.sanskrit}</p>
      </div>

      {/* Dosha Ring + Breakdown */}
      <div className="glass-card rounded-2xl p-8 mb-8">
        <DoshaRing percentages={percentages} primary={primary} />
        <div className="flex justify-center gap-8 mt-6">
          {(["vata", "pitta", "kapha"] as Dosha[]).map((d) => (
            <div key={d} className="text-center">
              <div className={`text-2xl font-display ${doshaProfiles[d].colorClass}`}>
                {percentages[d]}%
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                {doshaProfiles[d].name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="glass-card rounded-2xl p-6 lg:p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl ${profile.bgClass} flex items-center justify-center`}>
            <Leaf className={`w-4 h-4 ${profile.colorClass}`} />
          </div>
          <h2 className="text-lg font-display">Your Constitution</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">{profile.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Strengths */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-ayur-gold/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-ayur-gold" />
            </div>
            <h3 className="text-sm font-medium">Your Strengths</h3>
          </div>
          <div className="space-y-2">
            {profile.strengths.map((s) => (
              <div key={s} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-border/20">
                <span className="w-1.5 h-1.5 rounded-full bg-ayur-sage" />
                <span className="text-sm text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Watch For */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <h3 className="text-sm font-medium">Watch For</h3>
          </div>
          <div className="space-y-2">
            {profile.watchFor.map((w) => (
              <div key={w} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-yellow-500/[0.02] border border-yellow-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                <span className="text-sm text-muted-foreground">{w}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diet */}
      <div className="glass-card rounded-2xl p-6 lg:p-8 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-9 h-9 rounded-xl ${profile.bgClass} flex items-center justify-center`}>
            <Utensils className={`w-4 h-4 ${profile.colorClass}`} />
          </div>
          <h2 className="text-lg font-display">Diet Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-mono text-green-400 mb-3 uppercase tracking-wider">✓ Favor</h4>
            <div className="space-y-2">
              {profile.diet.favor.map((f) => (
                <div key={f} className="px-3 py-2 rounded-lg bg-green-400/[0.04] border border-green-400/10 text-sm text-muted-foreground">{f}</div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-mono text-red-400 mb-3 uppercase tracking-wider">✗ Reduce</h4>
            <div className="space-y-2">
              {profile.diet.avoid.map((a) => (
                <div key={a} className="px-3 py-2 rounded-lg bg-red-400/[0.04] border border-red-400/10 text-sm text-muted-foreground">{a}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lifestyle */}
      <div className="glass-card rounded-2xl p-6 lg:p-8 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-9 h-9 rounded-xl ${profile.bgClass} flex items-center justify-center`}>
            <Activity className={`w-4 h-4 ${profile.colorClass}`} />
          </div>
          <h2 className="text-lg font-display">Lifestyle Tips</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.lifestyle.map((l, i) => (
            <div key={l} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-border/20">
              <span className="text-xs font-mono text-ayur-gold mt-0.5">0{i + 1}</span>
              <span className="text-sm text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Herbs */}
      <div className="glass-card rounded-2xl p-6 lg:p-8 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-9 h-9 rounded-xl ${profile.bgClass} flex items-center justify-center`}>
            <Sprout className={`w-4 h-4 ${profile.colorClass}`} />
          </div>
          <h2 className="text-lg font-display">Recommended Herbs</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendedHerbs.map((herb) => (
            <Link
              key={herb.id}
              href={`/plants/${herb.id}`}
              className="group flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-border/20 hover:border-ayur-gold/30 hover:bg-white/[0.04] transition-all duration-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={herb.images[0]}
                alt={herb.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-ayur-gold transition-colors truncate">
                  {herb.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono italic truncate">
                  {herb.scientificName}
                </p>
              </div>
              <Heart className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-ayur-gold transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href={`/chat?herb=my Prakriti is ${prakritiName} (${percentages.vata}% Vata, ${percentages.pitta}% Pitta, ${percentages.kapha}% Kapha)`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ayur-gold text-background text-sm font-medium hover:bg-ayur-amber transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Discuss with Vaidya
        </Link>
        <button
          onClick={onRetake}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-card text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Retake Assessment
        </button>
      </div>
    </div>
  );
}
