"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessages, fromApiMessage, type ChatMessage } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import {
  ApiError,
  AUTH_EXPIRED_MESSAGE,
  deleteJson,
  getJson,
  postJson,
  postPublicJson,
  uploadFiles,
  type MessageItem,
  type AgentStep,
  type SessionItem,
  type UnsplashIntent,
  type UnsplashPhoto,
} from "@/lib/rag-api";

const SandParticles = dynamic(
  () => import("@/components/chat/sand-particles").then((mod) => mod.SandParticles),
  { ssr: false }
);

type ChatResponse = {
  answer: string;
  sources: unknown[];
  retrieval_query: string;
  session_title?: string | null;
  trace_id?: string;
  user_message?: MessageItem;
  assistant_message?: MessageItem;
  steps?: AgentStep[];
};

function predictedSteps(text: string, hasFiles: boolean): AgentStep[] {
  const lowered = ` ${text.toLowerCase()} `;
  const complex =
    hasFiles ||
    lowered.includes("compare") ||
    lowered.includes("research") ||
    lowered.includes("dosage") ||
    lowered.includes("dose") ||
    lowered.includes("safe") ||
    lowered.includes("safety") ||
    lowered.includes("side effect") ||
    lowered.includes("interaction") ||
    lowered.split(" and ").length > 2;
  const steps: AgentStep[] = [
    { key: "understand", label: "Reading your question" },
    { key: "context", label: "Searching knowledge" },
  ];
  if (complex) steps.push({ key: "safety", label: "Checking safety" });
  if (hasFiles) steps.push({ key: "compare", label: "Comparing sources" });
  steps.push({ key: "answer", label: "Preparing answer" });
  return steps;
}

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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const herbParam = searchParams.get("herb");
  const herbSentRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [photosByMessageId, setPhotosByMessageId] = useState<Record<string, UnsplashPhoto[]>>({});
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);

  const speak = useCallback((text: string) => {
    if (!voiceReplies || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
    utterance.rate = 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [voiceReplies]);

  const loadToken = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      throw new Error("Sign in again to load your chat history.");
    }
    const clerkToken = await getToken({ skipCache: true });
    if (!clerkToken) throw new Error("Could not get Clerk session token");
    setToken(clerkToken);
    return clerkToken;
  }, [getToken, isLoaded, isSignedIn]);

  const withFreshToken = useCallback(async <T,>(request: (authToken: string) => Promise<T>): Promise<T> => {
    try {
      return await request(await loadToken());
    } catch (exc) {
      if (exc instanceof ApiError && exc.status === 401) {
        return await request(await loadToken());
      }
      throw exc;
    }
  }, [loadToken]);

  const friendlyError = useCallback((exc: unknown) => {
    if (exc instanceof ApiError && exc.status === 401) return AUTH_EXPIRED_MESSAGE;
    return exc instanceof Error ? exc.message : String(exc);
  }, []);

  const refreshSessions = useCallback(async (authToken: string) => {
    const list = await getJson<SessionItem[]>("/sessions/", authToken);
    setSessions(list);
    return list;
  }, []);

  const loadMessages = useCallback(async (sessionId: string, authToken: string) => {
    const rows = await getJson<MessageItem[]>(`/sessions/${sessionId}/messages`, authToken);
    setMessages(rows.map(fromApiMessage));
    setPhotosByMessageId({});
  }, []);

  const createSession = useCallback(async (authToken: string) => {
    const created = await postJson<{ id: string }>("/sessions/", {}, authToken);
    setActiveSessionId(created.id);
    setMessages([]);
    await refreshSessions(authToken);
    return created.id;
  }, [refreshSessions]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    async function boot() {
      setError("");
      try {
        const list = await withFreshToken((authToken) => refreshSessions(authToken));
        if (cancelled) return;
        if (list.length > 0) {
          setActiveSessionId(list[0].id);
          await withFreshToken((authToken) => loadMessages(list[0].id, authToken));
        } else {
          await withFreshToken((authToken) => createSession(authToken));
        }
      } catch (exc) {
        if (!cancelled) setError(friendlyError(exc));
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, withFreshToken, refreshSessions, loadMessages, createSession, friendlyError]);

  const handleSelectSession = useCallback(async (id: string) => {
    setError("");
    try {
      setActiveSessionId(id);
      await withFreshToken((authToken) => loadMessages(id, authToken));
    } catch (exc) {
      setError(friendlyError(exc));
    }
  }, [withFreshToken, loadMessages, friendlyError]);

  const handleNewChat = useCallback(async () => {
    setError("");
    try {
      await withFreshToken((authToken) => createSession(authToken));
    } catch (exc) {
      setError(friendlyError(exc));
    }
  }, [withFreshToken, createSession, friendlyError]);

  const handleDeleteSession = useCallback(async (id: string) => {
    if (deletingSessionId) return;
    setError("");
    setDeletingSessionId(id);
    try {
      setSessions((prev) => prev.filter((session) => session.id !== id));
      await withFreshToken((authToken) => deleteJson(`/sessions/${id}`, authToken));
      const list = await withFreshToken((authToken) => refreshSessions(authToken));
      if (activeSessionId === id) {
        if (list.length > 0) {
          setActiveSessionId(list[0].id);
          await withFreshToken((authToken) => loadMessages(list[0].id, authToken));
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (exc) {
      setError(friendlyError(exc));
      try {
        await withFreshToken((authToken) => refreshSessions(authToken));
      } catch {
        // Keep the original delete error visible.
      }
    }
    finally {
      setDeletingSessionId(null);
    }
  }, [activeSessionId, withFreshToken, refreshSessions, loadMessages, deletingSessionId, friendlyError]);

  const loadUnsplashForMessage = useCallback(async (userText: string, message: ChatMessage) => {
    try {
      const intent = await postPublicJson<UnsplashIntent>("/unsplash/intent", { text: `${userText}\n\n${message.content}` });
      if (!intent.show_images || !intent.keyword) return;
      const photos = await postPublicJson<UnsplashPhoto[]>("/unsplash/search", { keyword: intent.keyword, per_page: 3 });
      if (photos.length) {
        setPhotosByMessageId((prev) => ({ ...prev, [message.id]: photos }));
      }
    } catch {
      // Unsplash is decorative; chat should stay quiet if it is unavailable.
    }
  }, []);

  const handleStop = useCallback(() => {
    abortController?.abort();
    setAbortController(null);
    setIsTyping(false);
    setAgentSteps([]);
  }, [abortController]);

  const handleSend = useCallback(async (text: string, files?: File[]) => {
    const content = text.trim() || (files?.length ? "Please help me with the attached file(s)." : "");
    if (!content || isTyping) return;
    setError("");
    setIsTyping(true);
    setAgentSteps(predictedSteps(content, Boolean(files?.length)));
    const controller = new AbortController();
    setAbortController(controller);
    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content,
      timestamp: new Date(),
      sources: files?.map((file, index) => ({
        type: "attachment",
        upload_id: `${optimisticId}-${index}`,
        filename: file.name,
        mime_type: file.type,
        status: "uploading",
      })),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const sessionId = activeSessionId || (await withFreshToken((freshToken) => createSession(freshToken)));
      let uploadIds: string[] | null = null;
      if (files?.length) {
        const uploaded = await withFreshToken((freshToken) => uploadFiles(sessionId, files, content, freshToken));
        uploadIds = uploaded.map((item) => item.id);
      }
      const response = await withFreshToken((freshToken) =>
        postJson<ChatResponse>(
          `/sessions/${sessionId}/chat/`,
          { content, language: null, upload_ids: uploadIds },
          freshToken,
          controller.signal
        )
      );
      if (response.user_message && response.assistant_message) {
        const realUser = fromApiMessage(response.user_message as MessageItem);
        const realAssistant = fromApiMessage(response.assistant_message as MessageItem);
        setMessages((prev) => [
          ...prev.filter((message) => message.id !== optimisticId),
          realUser,
          realAssistant,
        ]);
        speak(realAssistant.content);
        if (response.steps?.length) setAgentSteps(response.steps);
        loadUnsplashForMessage(content, realAssistant);
      } else {
        await withFreshToken((freshToken) => loadMessages(sessionId, freshToken));
        speak(response.answer);
      }
      if (response.session_title) {
        setSessions((prev) => prev.map((session) =>
          session.id === sessionId ? { ...session, title: response.session_title || session.title } : session
        ));
      }
      await withFreshToken((freshToken) => refreshSessions(freshToken));
    } catch (exc) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      if (exc instanceof DOMException && exc.name === "AbortError") {
        setError("Response stopped.");
      } else {
        setError(friendlyError(exc));
      }
    } finally {
      setIsTyping(false);
      setAbortController(null);
      setAgentSteps([]);
    }
  }, [activeSessionId, isTyping, createSession, loadMessages, refreshSessions, speak, loadUnsplashForMessage, withFreshToken, friendlyError]);

  const handleSuggestionClick = useCallback((text: string) => {
    handleSend(text);
  }, [handleSend]);

  // Auto-send herb query when navigating from plant detail page
  useEffect(() => {
    if (herbParam && isLoaded && isSignedIn && !herbSentRef.current && !isTyping && messages.length === 0) {
      herbSentRef.current = true;
      handleSend(`Tell me everything about ${herbParam} — its history, appearance, benefits, uses, and precautions.`);
    }
  }, [herbParam, isLoaded, isSignedIn, isTyping, messages.length, handleSend]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <ChatHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        voiceReplies={voiceReplies}
        onToggleVoiceReplies={() => setVoiceReplies((enabled) => !enabled)}
      />
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
          deletingSessionId={deletingSessionId}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ChatMessages messages={messages} isTyping={isTyping} token={token} agentSteps={agentSteps} photosByMessageId={photosByMessageId} onSuggestionClick={handleSuggestionClick} />
          <ChatInput onSend={handleSend} onStop={handleStop} disabled={!isLoaded || !isSignedIn} isThinking={isTyping} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!isSignedIn) {
    return <SignedOutPanel />;
  }
  return (
    <ChatApp />
  );
}
