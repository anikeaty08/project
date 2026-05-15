"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import herbImages from "@/lib/herb-images.json";

const imageMap = herbImages as Record<string, string[]>;

const remedies = [
  { name: "Ashwagandha", key: "ashwagandha", category: "Rasayana", hint: "Stress and stamina" },
  { name: "Brahmi", key: "brahmi", category: "Medhya", hint: "Memory and focus" },
  { name: "Triphala", key: "triphala", category: "Digestive", hint: "Gut and detox" },
  { name: "Turmeric", key: "turmeric", category: "Anti-inflammatory", hint: "Inflammation support" },
  { name: "Tulsi", key: "tulasi", category: "Adaptogen", hint: "Immunity and breath" },
  { name: "Shatavari", key: "shatavari", category: "Rejuvenative", hint: "Cooling nourishment" },
  { name: "Guduchi", key: "guduchi", category: "Immune", hint: "Fever and immunity" },
  { name: "Neem", key: "neem", category: "Purifying", hint: "Skin and cleansing" },
  { name: "Ginger", key: "ginger", category: "Digestive", hint: "Agni and nausea" },
  { name: "Amalaki", key: "amalaki", category: "Rasayana", hint: "Vitamin C tonic" },
];

export function HerbalRemediesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="remedies" ref={sectionRef} className="relative overflow-hidden">
      <div className="relative z-10 pt-28 lg:pt-36 text-center px-6">
        <span
          className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 justify-center ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="w-12 h-px bg-foreground/20" />
          Herbal Remedies
          <span className="w-12 h-px bg-foreground/20" />
        </span>

        <h2
          className={`text-5xl md:text-7xl lg:text-[104px] font-display tracking-tight leading-[0.95] transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Explore
          <br />
          <span className="text-muted-foreground">living herbs.</span>
        </h2>

        <p
          className={`mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto transition-all duration-1000 delay-100 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          Choose a plant and ask Vaidya AI about its uses, preparations, dosha fit, and safety notes.
        </p>
      </div>

      <div
        className={`relative left-1/2 -translate-x-1/2 w-screen -mt-8 transition-all duration-1000 delay-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/connection-KeJwWPQvn6l0a7C48tCARYtNEdC92H.png"
          alt=""
          aria-hidden="true"
          className="w-full h-auto object-cover"
        />
      </div>

      <div className="relative z-10 -mt-8 lg:-mt-28 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {remedies.map((remedy, index) => {
            const images = imageMap[remedy.key] || [];
            const image = images[index % Math.max(images.length, 1)] || images[0];

            return (
              <Link
                href={`/chat?herb=${encodeURIComponent(remedy.name)}`}
                key={remedy.name}
                aria-label={`Ask Vaidya AI about ${remedy.name}`}
                className={`group relative min-h-[260px] overflow-hidden border transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ayur-gold ${
                  hoveredIndex === index
                    ? "border-foreground bg-foreground/[0.04] scale-[1.02]"
                    : "border-foreground/10 hover:border-foreground/30"
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${index * 40 + 180}ms` }}
                onMouseEnter={(event) => {
                  setHoveredIndex(index);
                  const rect = event.currentTarget.getBoundingClientRect();
                  setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
                }}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setMousePos(null);
                }}
              >
                {image && (
                  <img
                    src={image}
                    alt={`${remedy.name} plant`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />

                {hoveredIndex === index && mousePos && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                      background: `radial-gradient(200px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.1) 0%, transparent 70%)`,
                    }}
                  />
                )}

                <span
                  className={`absolute top-3 right-3 z-10 text-[10px] font-mono px-2 py-0.5 transition-colors ${
                    hoveredIndex === index
                      ? "bg-foreground text-background"
                      : "bg-background/75 text-foreground"
                  }`}
                >
                  {remedy.category}
                </span>

                <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                  <span className="font-display text-3xl tracking-tight block">{remedy.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground/80">{remedy.hint}</span>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs font-mono text-foreground border border-foreground/10 group-hover:border-ayur-gold/60 transition-colors">
                    Ask Vaidya
                    <span className="group-hover:translate-x-1 transition-transform">-&gt;</span>
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground/20 overflow-hidden">
                  <div
                    className={`h-full bg-foreground transition-all duration-500 ${
                      hoveredIndex === index ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-8 pt-12 border-t border-foreground/10 transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-wrap gap-12">
            {[
              { value: "500+", label: "Herbs indexed" },
              { value: "Book-backed", label: "RAG citations" },
              { value: "Dosha", label: "Specific guidance" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-3">
                <span className="text-3xl font-display">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          <Link href="/plants" className="group inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
            Explore all herbs
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
