"use client";

import { useState } from "react";
import type { Plant } from "@/lib/plants-data";

interface PlantCardProps {
  plant: Plant;
  index: number;
  onClick: () => void;
}

export function PlantCard({ plant, index, onClick }: PlantCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const doshaColors: Record<string, string> = {
    Vata: "bg-blue-400/20 text-blue-300",
    Pitta: "bg-red-400/20 text-red-300",
    Kapha: "bg-green-400/20 text-green-300",
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative text-left w-full rounded-2xl overflow-hidden border border-border/30 bg-card transition-all duration-500 hover:border-ayur-gold/30 hover:shadow-lg hover:shadow-ayur-gold/5 hover:-translate-y-1"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {!imgLoaded && (
          <div className="absolute inset-0 card-shimmer bg-secondary" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plant.images[0]}
          alt={plant.name}
          className={`w-full h-full object-cover transition-all duration-700 ${
            isHovered ? "scale-110" : "scale-100"
          } ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />

        {/* Category badge */}
        <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-mono bg-black/50 backdrop-blur-md rounded-full text-white/80">
          {plant.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-display tracking-tight group-hover:text-ayur-gold transition-colors duration-300">
            {plant.name}
          </h3>
          <p className="text-xs text-muted-foreground font-mono italic">
            {plant.scientificName}
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {plant.description}
        </p>

        {/* Dosha tags */}
        <div className="flex flex-wrap gap-1.5">
          {plant.dosha.map((d) => (
            <span
              key={d}
              className={`px-2 py-0.5 text-[10px] font-mono rounded-full ${
                doshaColors[d] || "bg-white/10 text-white/60"
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Hover reveal arrow */}
        <div
          className={`flex items-center gap-1 text-xs text-ayur-gold transition-all duration-300 ${
            isHovered
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2"
          }`}
        >
          View details →
        </div>
      </div>
    </button>
  );
}
