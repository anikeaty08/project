import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaidya AI — Chat",
  description:
    "Ask Vaidya AI about Ayurvedic herbs, doshas, remedies, and holistic wellness guidance.",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
