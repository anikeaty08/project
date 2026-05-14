"use client";

import { Search, X } from "lucide-react";

interface PlantsSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  activeCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  categories: string[];
  resultCount: number;
}

export function PlantsSearch({ query, onQueryChange, activeCategory, onCategoryChange, categories, resultCount }: PlantsSearchProps) {
  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          id="plants-search"
          type="text"
          placeholder="Search herbs by name, property, or dosha..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full h-12 pl-11 pr-10 rounded-xl glass-card-strong text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:shadow-[0_0_0_1px_var(--ayur-gold)]"
        />
        {query && (
          <button onClick={() => onQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
        <button
          onClick={() => onCategoryChange(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-mono transition-all duration-200 ${
            !activeCategory ? "bg-ayur-gold text-background" : "glass-card text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          All ({resultCount})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(activeCategory === cat ? null : cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-mono transition-all duration-200 whitespace-nowrap ${
              activeCategory === cat ? "bg-ayur-gold text-background" : "glass-card text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
