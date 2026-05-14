"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Leaf, AlertTriangle, BookOpen, Beaker, Heart } from "lucide-react";
import type { Plant } from "@/lib/plants-data";

interface PlantDetailModalProps {
  plant: Plant | null;
  onClose: () => void;
}

export function PlantDetailModal({ plant, onClose }: PlantDetailModalProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (plant) {
      setCurrentImage(0);
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [plant]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft" && plant) setCurrentImage((p) => (p - 1 + plant.images.length) % plant.images.length);
      if (e.key === "ArrowRight" && plant) setCurrentImage((p) => (p + 1) % plant.images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [plant, handleClose]);

  if (!plant) return null;

  const doshaColors: Record<string, string> = {
    Vata: "bg-blue-400/20 text-blue-300 border-blue-400/30",
    Pitta: "bg-red-400/20 text-red-300 border-red-400/30",
    Kapha: "bg-green-400/20 text-green-300 border-green-400/30",
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className={`relative z-10 w-full max-w-3xl max-h-[90vh] bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 ${isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}>
        {/* Close button */}
        <button onClick={handleClose} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full glass-card-strong flex items-center justify-center text-foreground hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto max-h-[90vh] scrollbar-thin">
          {/* Image carousel */}
          <div className="relative aspect-[16/9] bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={plant.images[currentImage]} alt={`${plant.name} ${currentImage + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {plant.images.length > 1 && (
              <>
                <button onClick={() => setCurrentImage((p) => (p - 1 + plant.images.length) % plant.images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-card-strong flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentImage((p) => (p + 1) % plant.images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-card-strong flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {plant.images.map((_, i) => (
                    <button key={i} onClick={() => setCurrentImage(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? "bg-ayur-gold w-6" : "bg-white/40 hover:bg-white/60"}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 text-[10px] font-mono bg-ayur-gold/10 text-ayur-gold rounded-full">{plant.category}</span>
                {plant.dosha.map((d) => (
                  <span key={d} className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${doshaColors[d] || ""}`}>{d}</span>
                ))}
              </div>
              <h2 className="text-3xl font-display tracking-tight">{plant.name}</h2>
              <p className="text-sm text-muted-foreground font-mono italic mt-1">{plant.scientificName}</p>
            </div>

            <div className="h-px bg-border/50" />

            {/* Introduction */}
            <div className="flex gap-3">
              <Leaf className="w-5 h-5 text-ayur-gold flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-2">Introduction</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{plant.description}</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="flex gap-3">
              <Heart className="w-5 h-5 text-ayur-gold flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-3">Key Benefits</h3>
                <div className="grid grid-cols-2 gap-2">
                  {plant.benefits.map((b) => (
                    <div key={b} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-border/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-ayur-sage" />
                      <span className="text-xs text-muted-foreground">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Uses */}
            <div className="flex gap-3">
              <Beaker className="w-5 h-5 text-ayur-gold flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-3">Common Uses</h3>
                <div className="flex flex-wrap gap-2">
                  {plant.uses.map((u) => (
                    <span key={u} className="px-3 py-1.5 text-xs rounded-full glass-card text-muted-foreground">{u}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Precautions */}
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500/70 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-2">Precautions</h3>
                <p className="text-xs text-muted-foreground leading-relaxed bg-yellow-500/5 border border-yellow-500/10 rounded-lg px-4 py-3">{plant.precautions}</p>
              </div>
            </div>

            {/* Ask AI */}
            <div className="pt-2">
              <a href={`/chat`} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ayur-gold/10 text-ayur-gold text-sm hover:bg-ayur-gold/20 transition-colors">
                <BookOpen className="w-4 h-4" />
                Ask Vaidya AI about {plant.name}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
