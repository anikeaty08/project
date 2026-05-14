"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessages, type ChatMessage } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

// Dynamic import for Three.js to avoid SSR issues
const SandParticles = dynamic(
  () =>
    import("@/components/chat/sand-particles").then((mod) => mod.SandParticles),
  { ssr: false }
);

// Dummy AI responses
const aiResponses: Record<string, string> = {
  "Analyze my Dosha":
    "Based on Ayurvedic principles, your Dosha (constitution) is determined by your physical, mental, and emotional characteristics.\n\nTo analyze your Dosha, I'd consider factors like:\n\n🔥 **Pitta** — Medium build, sharp intellect, strong digestion, prone to inflammation\n💨 **Vata** — Light frame, creative mind, variable digestion, prone to anxiety\n🌊 **Kapha** — Sturdy build, calm nature, slow digestion, prone to weight gain\n\nMost people are a combination of two doshas. Would you like me to ask you some specific questions to determine your Prakriti (birth constitution)?",
  "Tell me about Ashwagandha":
    "🌿 **Ashwagandha** (Withania somnifera)\n\nAlso known as Indian Ginseng or Winter Cherry, Ashwagandha is one of the most powerful herbs in Ayurveda.\n\n**Key Benefits:**\n• Reduces cortisol levels and manages stress\n• Improves memory and cognitive function\n• Boosts immunity and physical endurance\n• Supports thyroid and reproductive health\n\n**Dosha:** Primarily balances Vata dosha\n**Category:** Rasayana (Rejuvenative)\n\n**How to use:** As powder (churna) mixed with warm milk and honey, capsules, or herbal tea.\n\n⚠️ **Precaution:** Pregnant women and those with thyroid disorders should consult a doctor before use.",
  "Stress relief remedies":
    "Here are the top Ayurvedic herbs for stress and anxiety relief:\n\n1. 🌿 **Ashwagandha** — The king of adaptogens. Lowers cortisol by up to 30%.\n\n2. 🧠 **Brahmi** — Calms the mind, improves focus and sleep quality.\n\n3. 🌸 **Jatamansi** — Ancient remedy for mental tranquility, similar to valerian.\n\n4. 🍃 **Tulsi (Holy Basil)** — Adaptogenic herb that balances stress hormones.\n\n5. 🌼 **Shankhpushpi** — Traditional brain tonic for anxiety and insomnia.\n\n**Daily Practice:**\n• Start with Ashwagandha milk before bed\n• Practice Pranayama (breathing exercises)\n• Use Brahmi oil for head massage\n\nWould you like detailed preparation methods for any of these?",
  "Panchakarma explained":
    "🏛️ **Panchakarma — The Five Sacred Cleansing Actions**\n\nPanchakarma is Ayurveda's premier detoxification and rejuvenation therapy, dating back over 5,000 years.\n\n**The Five Therapies:**\n\n1. **Vamana** (Therapeutic Emesis) — Cleanses the upper GI tract, balances Kapha\n2. **Virechana** (Purgation) — Purifies the liver and blood, balances Pitta\n3. **Basti** (Medicated Enema) — Most important therapy, balances Vata\n4. **Nasya** (Nasal Administration) — Clears sinuses and head region\n5. **Raktamokshana** (Blood Purification) — Removes toxins from blood\n\n**Preparation (Purvakarma):**\n• Snehana — Oil massage therapy\n• Swedana — Herbal steam therapy\n\n**Duration:** Typically 7-21 days under qualified supervision\n\n⚠️ Must be performed by a trained Ayurvedic practitioner.",
};

function getAIResponse(userMessage: string): string {
  // Check for keyword matches
  const msg = userMessage.toLowerCase();
  if (msg.includes("dosha") || msg.includes("constitution") || msg.includes("prakriti"))
    return aiResponses["Analyze my Dosha"];
  if (msg.includes("ashwagandha"))
    return aiResponses["Tell me about Ashwagandha"];
  if (msg.includes("stress") || msg.includes("anxiety") || msg.includes("calm"))
    return aiResponses["Stress relief remedies"];
  if (msg.includes("panchakarma") || msg.includes("detox") || msg.includes("cleanse"))
    return aiResponses["Panchakarma explained"];

  // Default response
  return `Thank you for your question about "${userMessage}".\n\nAs your Ayurvedic guide, I can help with:\n\n🌿 **Herbal Remedies** — Discover the right herbs for your needs\n🔮 **Dosha Analysis** — Understand your unique constitution\n🍵 **Preparations** — Traditional methods and recipes\n📚 **Ancient Wisdom** — Insights from classical Ayurvedic texts\n\nCould you provide more details about what you'd like to know? I'm here to guide your wellness journey.`;
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState("new");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = useCallback(
    (text: string, files?: { name: string; type: string; url?: string }[]) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
        files,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      // Simulate AI thinking
      const delay = 1000 + Math.random() * 1500;
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: getAIResponse(text),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, delay);
    },
    []
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend]
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId("new");
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <ChatHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D Sand background */}
        <SandParticles />

        {/* Sidebar */}
        <ChatSidebar
          isOpen={sidebarOpen}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            onSuggestionClick={handleSuggestionClick}
          />
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </div>
      </div>
    </div>
  );
}
