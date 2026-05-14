"use client";

import { PanelLeftClose, PanelLeftOpen, Leaf, Sprout, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ChatHeader({ sidebarOpen, onToggleSidebar }: ChatHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("vaidya_auth");
    router.push("/");
  };

  return (
    <header className="relative z-30 flex items-center justify-between h-14 px-4 border-b border-border/50">
      {/* Left: sidebar toggle */}
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle"
          onClick={onToggleSidebar}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Center: logo */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-ayur-gold" />
        <span className="font-display text-lg tracking-tight">Vaidya</span>
        <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
          AI
        </span>
      </div>

      {/* Right: nav + avatar */}
      <div className="flex items-center gap-2">
        <Link
          href="/plants"
          className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
        >
          <Sprout className="w-3.5 h-3.5" />
          Herbarium
        </Link>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-ayur-gold/20 flex items-center justify-center text-xs font-medium text-ayur-gold">
          V
        </div>
      </div>
    </header>
  );
}
