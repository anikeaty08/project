"use client";

import { Plus, MessageSquare, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { SessionItem } from "@/lib/rag-api";

interface ChatSidebarProps {
  isOpen: boolean;
  sessions: SessionItem[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  deletingSessionId?: string | null;
}

function groupForDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const diff = today.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "Previous 7 Days";
  return "Previous 30 Days";
}

export function ChatSidebar({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  deletingSessionId,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const grouped = useMemo(() => {
    const filtered = sessions.filter((s) =>
      (s.title?.trim() || "New chat").toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.reduce<Record<string, SessionItem[]>>((acc, session) => {
      const group = groupForDate(session.updated_at || session.created_at);
      acc[group] = acc[group] || [];
      acc[group].push(session);
      return acc;
    }, {});
  }, [sessions, searchQuery]);

  return (
    <aside
      className={`relative z-20 flex flex-col h-full bg-background/80 backdrop-blur-xl border-r border-border/50 transition-all duration-300 ease-in-out ${isOpen ? "w-72" : "w-0"} overflow-hidden`}
    >
      <div className="flex-shrink-0 p-3 space-y-3" style={{ minWidth: "288px" }}>
        <button onClick={onNewChat} className="w-full h-10 rounded-xl glass-card hover:bg-white/5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 group">
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New chat
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-border/30 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ayur-gold/30 transition-colors" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4" style={{ minWidth: "288px" }}>
        {Object.entries(grouped).map(([group, groupSessions]) => (
          <div key={group} className="mb-4">
            <h3 className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">{group}</h3>
            {groupSessions.map((session) => (
              <div key={session.id} className="group flex items-center gap-1">
                <button onClick={() => onSelectSession(session.id)} className={`min-w-0 flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${activeSessionId === session.id ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"}`}>
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                  <span className="flex-1 text-sm truncate">{session.title?.trim() || "New chat"}</span>
                </button>
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  disabled={deletingSessionId === session.id}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-red-400/70 hover:text-red-300 hover:bg-white/10 transition-colors ${activeSessionId === session.id ? "opacity-100" : "opacity-70 group-hover:opacity-100"} disabled:opacity-30 disabled:cursor-wait`}
                  aria-label="Delete chat"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">No chats yet.</p>
        )}
      </div>
    </aside>
  );
}
