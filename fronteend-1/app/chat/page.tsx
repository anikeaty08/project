"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessages, fromApiMessage, type ChatMessage } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import {
  deleteJson,
  getJson,
  postJson,
  uploadFiles,
  type MessageItem,
  type SessionItem,
} from "@/lib/rag-api";

const SandParticles = dynamic(
  () => import("@/components/chat/sand-particles").then((mod) => mod.SandParticles),
  { ssr: false }
);

type ChatResponse = {
  answer: string;
  sources: unknown[];
  retrieval_query: string;
  trace_id?: string;
  user_message?: MessageItem;
  assistant_message?: MessageItem;
};

function SignedOutPanel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full glass-card-strong rounded-2xl p-8 text-center">
        <h1 className="text-3xl font-display mb-3">Sign in to use Vaidya AI</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your chats, uploads, and plant image analysis are stored under your account.
        </p>
        <SignInButton mode="modal">
          <button className="h-11 px-5 rounded-xl bg-ayur-gold text-background font-medium hover:bg-ayur-amber transition-colors">
            Sign in
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

function ChatApp() {
  const { getToken, isLoaded } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  const loadToken = useCallback(async () => {
    const clerkToken = await getToken();
    if (!clerkToken) throw new Error("Could not get Clerk session token");
    setToken(clerkToken);
    return clerkToken;
  }, [getToken]);

  const refreshSessions = useCallback(async (authToken: string) => {
    const list = await getJson<SessionItem[]>("/sessions/", authToken);
    setSessions(list);
    return list;
  }, []);

  const loadMessages = useCallback(async (sessionId: string, authToken: string) => {
    const rows = await getJson<MessageItem[]>(`/sessions/${sessionId}/messages`, authToken);
    setMessages(rows.map(fromApiMessage));
  }, []);

  const createSession = useCallback(async (authToken: string) => {
    const created = await postJson<{ id: string }>("/sessions/", {}, authToken);
    setActiveSessionId(created.id);
    setMessages([]);
    await refreshSessions(authToken);
    return created.id;
  }, [refreshSessions]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    async function boot() {
      setError("");
      try {
        const authToken = await loadToken();
        const list = await refreshSessions(authToken);
        if (cancelled) return;
        if (list.length > 0) {
          setActiveSessionId(list[0].id);
          await loadMessages(list[0].id, authToken);
        } else {
          await createSession(authToken);
        }
      } catch (exc) {
        if (!cancelled) setError(exc instanceof Error ? exc.message : String(exc));
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, loadToken, refreshSessions, loadMessages, createSession]);

  const handleSelectSession = useCallback(async (id: string) => {
    setError("");
    try {
      const authToken = token || (await loadToken());
      setActiveSessionId(id);
      await loadMessages(id, authToken);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    }
  }, [token, loadToken, loadMessages]);

  const handleNewChat = useCallback(async () => {
    setError("");
    try {
      const authToken = token || (await loadToken());
      await createSession(authToken);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    }
  }, [token, loadToken, createSession]);

  const handleDeleteSession = useCallback(async (id: string) => {
    setError("");
    try {
      const authToken = token || (await loadToken());
      await deleteJson(`/sessions/${id}`, authToken);
      const list = await refreshSessions(authToken);
      if (activeSessionId === id) {
        if (list.length > 0) {
          setActiveSessionId(list[0].id);
          await loadMessages(list[0].id, authToken);
        } else {
          await createSession(authToken);
        }
      }
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    }
  }, [activeSessionId, token, loadToken, refreshSessions, loadMessages, createSession]);

  const handleSend = useCallback(async (text: string, files?: File[]) => {
    const content = text.trim() || (files?.length ? "Please help me with the attached file(s)." : "");
    if (!content || isTyping) return;
    setError("");
    setIsTyping(true);
    try {
      const authToken = token || (await loadToken());
      const sessionId = activeSessionId || (await createSession(authToken));
      let uploadIds: string[] | null = null;
      if (files?.length) {
        const uploaded = await uploadFiles(sessionId, files, content, authToken);
        uploadIds = uploaded.map((item) => item.id);
      }
      const response = await postJson<ChatResponse>(
        `/sessions/${sessionId}/chat/`,
        { content, language: null, upload_ids: uploadIds },
        authToken
      );
      if (response.user_message && response.assistant_message) {
        setMessages((prev) => [
          ...prev,
          fromApiMessage(response.user_message as MessageItem),
          fromApiMessage(response.assistant_message as MessageItem),
        ]);
      } else {
        await loadMessages(sessionId, authToken);
      }
      await refreshSessions(authToken);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setIsTyping(false);
    }
  }, [activeSessionId, token, isTyping, loadToken, createSession, loadMessages, refreshSessions]);

  const handleSuggestionClick = useCallback((text: string) => {
    handleSend(text);
  }, [handleSend]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <ChatHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      {error && (
        <div className="relative z-40 bg-destructive/15 border-b border-destructive/30 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="flex-1 flex overflow-hidden relative">
        <SandParticles />
        <ChatSidebar
          isOpen={sidebarOpen}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ChatMessages messages={messages} isTyping={isTyping} token={token} onSuggestionClick={handleSuggestionClick} />
          <ChatInput onSend={handleSend} disabled={isTyping || !token} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <>
      <SignedOut>
        <SignedOutPanel />
      </SignedOut>
      <SignedIn>
        <ChatApp />
      </SignedIn>
    </>
  );
}
