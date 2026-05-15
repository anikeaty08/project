"use client";

import { useState } from "react";
import { Clock, Trash2, ChevronRight, Cpu } from "lucide-react";
import { doshaProfiles, type Dosha } from "@/lib/prakriti-data";
import { type PrakritiResultResponse, formatDate } from "@/lib/prakriti-api";

interface PrakritiHistoryProps {
  history: PrakritiResultResponse[];
  onViewResult: (entry: PrakritiResultResponse) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}

export function PrakritiHistory({ history, onViewResult, onDelete, deleting }: PrakritiHistoryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No past assessments yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Your results will appear here after you take a quiz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        Past Assessments
        <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{history.length} results</span>
      </h3>

      {history.map((entry) => {
        const profile = doshaProfiles[entry.primary_dosha as Dosha];
        if (!profile) return null;
        const pcts = { vata: entry.vata_pct, pitta: entry.pitta_pct, kapha: entry.kapha_pct };

        return (
          <button
            key={entry.id}
            onClick={() => onViewResult(entry)}
            onMouseEnter={() => setHoveredId(entry.id)}
            onMouseLeave={() => setHoveredId(null)}
            disabled={deleting === entry.id}
            className={`w-full glass-card rounded-xl p-4 text-left hover:border-ayur-gold/20 hover:bg-white/[0.03] transition-all duration-300 group ${deleting === entry.id ? "opacity-40" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${profile.bgClass} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-lg font-display ${profile.colorClass}`}>
                  {entry.prakriti_name.charAt(0)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{entry.prakriti_name}</p>
                  {entry.mode === "ai-generated" && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-400/10 text-purple-400">
                      <Cpu className="w-2.5 h-2.5" />AI
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono">{formatDate(entry.created_at)}</span>
                  <span className="text-[10px] text-muted-foreground/50">{entry.question_count}Q</span>
                  <div className="flex items-center gap-1">
                    {(["vata", "pitta", "kapha"] as Dosha[]).map((d) => (
                      <div
                        key={d}
                        className="h-1 rounded-full"
                        style={{
                          width: `${Math.max(pcts[d] / 5, 2)}px`,
                          backgroundColor: doshaProfiles[d].color,
                          opacity: 0.6,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {hoveredId === entry.id && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-ayur-gold group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
