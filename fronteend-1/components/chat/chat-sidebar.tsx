"use client";

import { Plus, MessageSquare, Search, Trash2, MoreHorizontal } from "lucide-react";
import { useState } from "react";

interface ChatSession {
  id: string;
  title: string;
  date: string;
  group: string;
}

const dummySessions: ChatSession[] = [
  { id: "1", title: "Ashwagandha for stress relief", date: "today", group: "Today" },
  { id: "2", title: "My Dosha analysis results", date: "today", group: "Today" },
  { id: "3", title: "Best herbs for digestion", date: "today", group: "Today" },
  { id: "4", title: "Triphala cleansing routine", date: "yesterday", group: "Yesterday" },
  { id: "5", title: "Brahmi memory enhancement", date: "yesterday", group: "Yesterday" },
  { id: "6", title: "Tulsi tea preparation", date: "week", group: "Previous 7 Days" },
  { id: "7", title: "Neem skin remedies", date: "week", group: "Previous 7 Days" },
  { id: "8", title: "Shatavari hormonal balance", date: "week", group: "Previous 7 Days" },
  { id: "9", title: "Guduchi immunity protocol", date: "week", group: "Previous 7 Days" },
  { id: "10", title: "Turmeric golden milk recipe", date: "month", group: "Previous 30 Days" },
  { id: "11", title: "Morning Ayurvedic routine", date: "month", group: "Previous 30 Days" },
  { id: "12", title: "Pitta dosha diet plan", date: "month", group: "Previous 30 Days" },
  { id: "13", title: "Panchakarma therapy overview", date: "month", group: "Previous 30 Days" },
  { id: "14", title: "Licorice for throat health", date: "month", group: "Previous 30 Days" },
];

interface ChatSidebarProps {
  isOpen: boolean;
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  isOpen,
  activeSessionId,
  onSelectSession,
  onNewChat,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredSessions = dummySessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groups = [...new Set(filteredSessions.map((s) => s.group))];

  return (
    <aside
      className={`relative z-20 flex flex-col h-full bg-background/80 backdrop-blur-xl border-r border-border/50 transition-all duration-300 ease-in-out ${
        isOpen ? "w-72" : "w-0"
      } overflow-hidden`}
    >
      <div className="flex-shrink-0 p-3 space-y-3" style={{ minWidth: "288px" }}>
        {/* New chat button */}
        <button
          id="new-chat-btn"
          onClick={onNewChat}
          className="w-full h-10 rounded-xl glass-card hover:bg-white/5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New chat
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            id="chat-search"
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-border/30 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ayur-gold/30 transition-colors"
          />
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4" style={{ minWidth: "288px" }}>
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <h3 className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
              {group}
            </h3>
            {filteredSessions
              .filter((s) => s.group === group)
              .map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  onMouseEnter={() => setHoveredId(session.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                    activeSessionId === session.id
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                  <span className="flex-1 text-sm truncate">{session.title}</span>
                  {hoveredId === session.id && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors">
                        <MoreHorizontal className="w-3 h-3" />
                      </span>
                      <span className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors text-red-400/70">
                        <Trash2 className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>

      {/* Bottom: user info */}
      <div className="flex-shrink-0 p-3 border-t border-border/30" style={{ minWidth: "288px" }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-ayur-gold/20 flex items-center justify-center text-xs font-medium text-ayur-gold">
            V
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">Vaidya User</p>
            <p className="text-[10px] text-muted-foreground truncate font-mono">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
