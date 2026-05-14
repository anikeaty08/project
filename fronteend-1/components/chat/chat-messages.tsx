"use client";

import { useRef, useEffect } from "react";
import { Leaf, Sparkles, MessageSquare, BookOpen, Heart } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  files?: { name: string; type: string; url?: string }[];
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  {
    icon: Sparkles,
    title: "Analyze my Dosha",
    description: "Discover your Ayurvedic constitution",
  },
  {
    icon: Leaf,
    title: "Tell me about Ashwagandha",
    description: "Benefits, uses, and precautions",
  },
  {
    icon: Heart,
    title: "Stress relief remedies",
    description: "Natural herbs for anxiety & calm",
  },
  {
    icon: BookOpen,
    title: "Panchakarma explained",
    description: "Ancient detox therapy overview",
  },
];

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 msg-enter">
      <div className="w-8 h-8 rounded-full bg-ayur-gold/15 flex items-center justify-center flex-shrink-0">
        <Leaf className="w-4 h-4 text-ayur-gold" />
      </div>
      <div className="bg-chat-ai-bg rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ayur-gold/60 typing-dot" />
          <span className="w-2 h-2 rounded-full bg-ayur-gold/60 typing-dot" />
          <span className="w-2 h-2 rounded-full bg-ayur-gold/60 typing-dot" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 msg-enter ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-ayur-gold/15 flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-ayur-gold" />
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">Y</span>
        </div>
      )}

      <div className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : ""}`}>
        {/* Files */}
        {message.files && message.files.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isUser ? "justify-end" : ""}`}>
            {message.files.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-xs"
              >
                {file.type.startsWith("image/") ? (
                  <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center overflow-hidden">
                    {file.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground text-[8px]">
                        IMG
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-ayur-gold/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-ayur-gold" />
                  </div>
                )}
                <div>
                  <p className="text-foreground truncate max-w-[120px]">
                    {file.name}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {file.type.split("/")[1]?.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-chat-user-bg rounded-tr-sm text-foreground"
              : "bg-chat-ai-bg rounded-tl-sm text-foreground/90"
          }`}
        >
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-2" : ""}>
              {line}
            </p>
          ))}
        </div>

        {/* Timestamp */}
        <p
          className={`text-[10px] text-muted-foreground/50 font-mono px-1 ${
            isUser ? "text-right" : ""
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  isTyping,
  onSuggestionClick,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Empty state / welcome
  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass-card-strong mb-6 float-subtle">
            <Leaf className="w-10 h-10 text-ayur-gold" />
          </div>
          <h2 className="text-2xl font-display tracking-tight mb-2">
            How can I help you today?
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Ask about Ayurvedic herbs, doshas, remedies, or wellness practices.
            I&apos;m your personal Ayurvedic guide.
          </p>
        </div>

        {/* Suggestion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
          {suggestions.map((s) => (
            <button
              key={s.title}
              onClick={() => onSuggestionClick(s.title)}
              className="group glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-all duration-300 hover:border-ayur-gold/20"
            >
              <div className="flex items-start gap-3">
                <s.icon className="w-4 h-4 text-ayur-gold/70 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium group-hover:text-ayur-gold transition-colors">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom tag */}
        <p className="mt-12 text-[10px] font-mono text-muted-foreground/40 flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          Powered by 5000+ years of Ayurvedic wisdom
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
