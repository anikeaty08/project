"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Leaf,
  Heart,
  Beaker,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Sprout,
  LogOut,
  Share2,
  Eye,
  ScrollText,
  Stethoscope,
} from "lucide-react";
import { plants } from "@/lib/plants-data";
import { allHerbDetails } from "@/lib/herb-details-index";

export default function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [currentImage, setCurrentImage] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const plant = plants.find((p) => p.id === id);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    if (!plant || plant.images.length <= 1) return;
    const interval = setInterval(() => {
      setImgLoaded(false);
      setCurrentImage((p) => (p + 1) % plant.images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [plant]);

  // Keyboard navigation for images
  useEffect(() => {
    if (!plant) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setCurrentImage(
          (p) => (p - 1 + plant.images.length) % plant.images.length
        );
      if (e.key === "ArrowRight")
        setCurrentImage((p) => (p + 1) % plant.images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [plant]);

  if (!plant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sprout className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-display mb-2">Herb not found</h1>
          <p className="text-muted-foreground mb-6">
            The plant you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/plants"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ayur-gold text-background text-sm hover:bg-ayur-amber transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Herbarium
          </Link>
        </div>
      </div>
    );
  }

  const doshaColors: Record<string, string> = {
    Vata: "bg-blue-400/20 text-blue-300 border-blue-400/30",
    Pitta: "bg-red-400/20 text-red-300 border-red-400/30",
    Kapha: "bg-green-400/20 text-green-300 border-green-400/30",
  };

  // Find prev/next plants for navigation
  const currentIndex = plants.findIndex((p) => p.id === id);
  const prevPlant = currentIndex > 0 ? plants[currentIndex - 1] : null;
  const nextPlant =
    currentIndex < plants.length - 1 ? plants[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/plants")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Herbarium</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <Link href="/chat" className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-ayur-gold" />
              <span className="font-display text-lg tracking-tight">
                Vaidya
              </span>
              <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                AI
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("vaidya_auth");
                router.push("/");
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero image section */}
      <section className="relative">
        <div className="relative h-[40vh] sm:h-[50vh] lg:h-[60vh] overflow-hidden bg-secondary">
          {!imgLoaded && (
            <div className="absolute inset-0 card-shimmer bg-secondary" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={plant.images[currentImage]}
            alt={`${plant.name} - image ${currentImage + 1}`}
            className={`w-full h-full object-cover transition-all duration-700 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />

          {/* Image navigation */}
          {plant.images.length > 1 && (
            <>
              <button
                onClick={() => {
                  setImgLoaded(false);
                  setCurrentImage(
                    (p) =>
                      (p - 1 + plant.images.length) % plant.images.length
                  );
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass-card-strong flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setImgLoaded(false);
                  setCurrentImage((p) => (p + 1) % plant.images.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass-card-strong flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {plant.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setImgLoaded(false);
                      setCurrentImage(i);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentImage
                        ? "bg-ayur-gold w-8"
                        : "bg-white/40 w-2 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Thumbnail strip */}
          {plant.images.length > 1 && (
            <div className="absolute bottom-6 right-6 flex gap-2 z-10">
              {plant.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setImgLoaded(false);
                    setCurrentImage(i);
                  }}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    i === currentImage
                      ? "border-ayur-gold shadow-lg shadow-ayur-gold/20"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 -mt-8 relative z-10">
        <div
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 text-[11px] font-mono bg-ayur-gold/10 text-ayur-gold rounded-full">
                  {plant.category}
                </span>
                {plant.dosha.map((d) => (
                  <span
                    key={d}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded-full border ${
                      doshaColors[d] || ""
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight">
                {plant.name}
              </h1>
              <p className="text-base text-muted-foreground font-mono italic mt-2">
                {plant.scientificName}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/chat?herb=${encodeURIComponent(plant.name)}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ayur-gold text-background text-sm font-medium hover:bg-ayur-amber transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Ask Vaidya about {plant.name}
              </Link>
              <button className="w-11 h-11 rounded-xl glass-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
            {/* Left column: description */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div className="glass-card rounded-2xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-ayur-gold/10 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-ayur-gold" />
                  </div>
                  <h2 className="text-lg font-display">About</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {plant.description}
                </p>
              </div>

              {/* Appearance */}
              {allHerbDetails[plant.id]?.appearance && (
                <div className="glass-card rounded-2xl p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-display">Appearance</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {allHerbDetails[plant.id].appearance}
                  </p>
                </div>
              )}

              {/* Historical Background */}
              {allHerbDetails[plant.id]?.history && (
                <div className="glass-card rounded-2xl p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <ScrollText className="w-4 h-4 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-display">Historical Background</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {allHerbDetails[plant.id].history}
                  </p>
                </div>
              )}

              {/* Medicinal Properties */}
              {allHerbDetails[plant.id]?.medicinal && (
                <div className="glass-card rounded-2xl p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4 text-blue-400" />
                    </div>
                    <h2 className="text-lg font-display">Medicinal Properties</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {allHerbDetails[plant.id].medicinal}
                  </p>
                </div>
              )}

              {/* Benefits */}
              <div className="glass-card rounded-2xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-ayur-gold/10 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-ayur-gold" />
                  </div>
                  <h2 className="text-lg font-display">Key Benefits</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plant.benefits.map((b, i) => (
                    <div
                      key={b}
                      className={`flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-border/20 transition-all duration-500 ${
                        isVisible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                      style={{ transitionDelay: `${i * 100 + 300}ms` }}
                    >
                      <span className="w-2 h-2 rounded-full bg-ayur-sage flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Precautions */}
              <div className="glass-card rounded-2xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </div>
                  <h2 className="text-lg font-display">Precautions</h2>
                </div>
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl px-5 py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {plant.precautions}
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: sidebar info */}
            <div className="space-y-6">
              {/* Quick facts */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-sm font-medium mb-4">Quick Facts</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-xs text-muted-foreground">
                      Category
                    </span>
                    <span className="text-xs font-mono text-ayur-gold">
                      {plant.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-xs text-muted-foreground">
                      Dosha Affinity
                    </span>
                    <span className="text-xs font-mono">
                      {plant.dosha.join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-xs text-muted-foreground">
                      Scientific Name
                    </span>
                    <span className="text-xs font-mono italic">
                      {plant.scientificName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-muted-foreground">
                      Images
                    </span>
                    <span className="text-xs font-mono">
                      {plant.images.length} photos
                    </span>
                  </div>
                </div>
              </div>

              {/* Uses */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-ayur-gold/10 flex items-center justify-center">
                    <Beaker className="w-4 h-4 text-ayur-gold" />
                  </div>
                  <h3 className="text-sm font-medium">Common Uses</h3>
                </div>
                <div className="space-y-2">
                  {plant.uses.map((u) => (
                    <div
                      key={u}
                      className="px-4 py-3 rounded-xl bg-white/[0.02] border border-border/20 text-sm text-muted-foreground"
                    >
                      {u}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ask AI card */}
              <div className="rounded-2xl p-6 bg-gradient-to-br from-ayur-gold/10 to-ayur-amber/5 border border-ayur-gold/20">
                <Leaf className="w-8 h-8 text-ayur-gold mb-3" />
                <h3 className="text-sm font-medium mb-2">
                  Need more information?
                </h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Ask Vaidya AI for personalized guidance about{" "}
                  {plant.name}, including dosage, preparations, and dosha
                  compatibility.
                </p>
                <Link
                  href={`/chat?herb=${encodeURIComponent(plant.name)}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ayur-gold text-background text-xs font-medium hover:bg-ayur-amber transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat with Vaidya
                </Link>
              </div>
            </div>
          </div>

          {/* Prev/Next navigation */}
          <div className="border-t border-border/30 py-8">
            <div className="flex items-center justify-between">
              {prevPlant ? (
                <Link
                  href={`/plants/${prevPlant.id}`}
                  className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mb-0.5">
                      Previous
                    </p>
                    <p className="font-display">{prevPlant.name}</p>
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {nextPlant ? (
                <Link
                  href={`/plants/${nextPlant.id}`}
                  className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors text-right"
                >
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mb-0.5">
                      Next
                    </p>
                    <p className="font-display">{nextPlant.name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
