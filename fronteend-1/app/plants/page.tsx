"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Leaf, MessageSquare, LogOut, Sprout, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { plants, categories } from "@/lib/plants-data";
import { PlantCard } from "@/components/plants/plant-card";
import { PlantsSearch } from "@/components/plants/plants-search";

export default function PlantsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = plants;
    if (activeCategory) {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.scientificName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.dosha.some((d) => d.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [query, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
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
            <span className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-ayur-gold bg-ayur-gold/10">
              <Sprout className="w-3.5 h-3.5" />
              Herbarium
            </span>
            <Link href="/prakriti" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <Sparkles className="w-3.5 h-3.5" />
              Prakriti
            </Link>
            <button onClick={() => { localStorage.removeItem("vaidya_auth"); router.push("/"); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-12 px-6 lg:px-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-ayur-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-[1400px] mx-auto relative">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/20" />
            Sacred Herbarium
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.92] mb-4">
            Nature&apos;s
            <br />
            <span className="text-muted-foreground">pharmacy.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mt-6">
            Explore our comprehensive collection of <span className="text-ayur-gold font-medium">{plants.length}+</span> Ayurvedic medicinal plants with detailed benefits, uses, and traditional preparations.
          </p>
        </div>
      </section>

      {/* Search + Grid */}
      <section className="px-6 lg:px-12 pb-24">
        <div className="max-w-[1400px] mx-auto space-y-8">
          <PlantsSearch
            query={query}
            onQueryChange={setQuery}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            categories={categories}
            resultCount={filtered.length}
          />

          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <Sprout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No herbs found matching your search.</p>
              <button onClick={() => { setQuery(""); setActiveCategory(null); }} className="mt-3 text-sm text-ayur-gold hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((plant, i) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  index={i}
                  onClick={() => router.push(`/plants/${plant.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
