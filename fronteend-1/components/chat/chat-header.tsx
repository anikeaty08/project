"use client";

import { PanelLeftClose, PanelLeftOpen, Leaf, Sprout, Volume2, VolumeX, Sparkles } from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  voiceReplies: boolean;
  onToggleVoiceReplies: () => void;
}

export function ChatHeader({
  sidebarOpen,
  onToggleSidebar,
  voiceReplies,
  onToggleVoiceReplies,
}: ChatHeaderProps) {
  return (
    <header className="relative z-30 flex items-center justify-between h-14 px-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200" aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-ayur-gold" />
        <span className="font-display text-lg tracking-tight">Vaidya</span>
        <span className="text-[10px] font-mono text-muted-foreground mt-0.5">AI</span>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onToggleVoiceReplies} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${voiceReplies ? "bg-ayur-gold/15 text-ayur-gold" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} aria-label={voiceReplies ? "Turn voice replies off" : "Turn voice replies on"} title={voiceReplies ? "Voice replies on" : "Voice replies off"}>
          {voiceReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <Link href="/plants" className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
          <Sprout className="w-3.5 h-3.5" />
          Herbarium
        </Link>
        <Link href="/prakriti" className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
          <Sparkles className="w-3.5 h-3.5" />
          Prakriti
        </Link>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
