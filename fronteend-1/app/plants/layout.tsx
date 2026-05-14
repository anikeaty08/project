import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaidya — Sacred Herbarium | 50+ Ayurvedic Plants",
  description: "Explore our comprehensive collection of 50+ Ayurvedic medicinal plants with detailed benefits, uses, dosha analysis, and traditional preparations.",
};

export default function PlantsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
