"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessages, fromApiMessage, type ChatMessage, type DoshaQuizState } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import herbImages from "@/lib/herb-images.json";
import { calculateResults, doshaProfiles, quizQuestions, type Dosha } from "@/lib/prakriti-data";
import { generateQuiz, savePrakritiResult } from "@/lib/prakriti-api";
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

const FALLBACK_DOSHA_QUESTIONS = quizQuestions.slice(0, 12);
const CHAT_DOSHA_QUESTION_COUNT = 12;

function isDoshaAnalysisTrigger(text: string) {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized === "analyze my dosha" ||
    normalized === "analyse my dosha" ||
    normalized.includes("analyze my dosha") ||
    normalized.includes("analyse my dosha") ||
    normalized.includes("what is my dosha") ||
    normalized.includes("find my dosha")
  );
}

function doshaLabel(dosha: Dosha) {
  return doshaProfiles[dosha].name;
}

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildDoshaAnalysisMessage(answers: Record<number, Dosha>, saved: boolean) {
  const result = calculateResults(answers);
  const primary = doshaProfiles[result.primary];
  const secondary = doshaProfiles[result.secondary];
  const herbs = primary.herbs.map((herb) => herb.charAt(0).toUpperCase() + herb.slice(1)).join(", ");
  const saveLine = saved
    ? "I saved this result to your Prakriti history."
    : "I could not save this to your Prakriti history right now, but your analysis is ready here.";

  return [
    `## Your Dosha Analysis: ${result.prakritiName}`,
    "",
    `Based on your 12 MCQ answers, your current profile leans **${result.prakritiName}**.`,
    "",
    `- Vata: ${result.percentages.vata}%`,
    `- Pitta: ${result.percentages.pitta}%`,
    `- Kapha: ${result.percentages.kapha}%`,
    `- Primary dosha: ${doshaLabel(result.primary)}`,
    `- Secondary dosha: ${doshaLabel(result.secondary)}`,
    "",
    `### ${primary.name} Pattern`,
    primary.description,
    "",
    result.isDual ? `Your result is close enough to read as a dual constitution, so also watch the **${secondary.name}** pattern: ${secondary.description}` : `Your secondary influence is **${secondary.name}**, so some traits from that dosha may show up too.`,
    "",
    "### Strengths",
    formatList(primary.strengths),
    "",
    "### Watch-Outs",
    formatList(primary.watchFor),
    "",
    "### Diet Guidance",
    "**Favor:**",
    formatList(primary.diet.favor),
    "",
    "**Reduce when imbalanced:**",
    formatList(primary.diet.avoid),
    "",
    "### Lifestyle Guidance",
    formatList(primary.lifestyle),
    "",
    "### Helpful Ayurvedic Herbs",
    herbs,
    "",
    "Use herbs thoughtfully, especially if you are pregnant, managing a condition, or taking medication.",
    "",
    `_${saveLine} This is wellness guidance for self-understanding, not a medical diagnosis or treatment plan._`,
  ].join("\n");
}

function answersForHistory(quiz: DoshaQuizState) {
  return Object.fromEntries(
    quiz.questions.map((question) => [
      String(question.id),
      {
        answer: quiz.answers[question.id] || "",
        category: question.category,
        question: question.question,
        options: question.options,
      },
    ])
  );
}

function validDoshaQuestions(questions: unknown) {
  if (!Array.isArray(questions)) return [];
  return questions.filter((question) => {
    if (!question || typeof question !== "object") return false;
    const q = question as { id?: unknown; category?: unknown; question?: unknown; options?: unknown };
    if (typeof q.id !== "number" || typeof q.category !== "string" || typeof q.question !== "string") return false;
    if (!Array.isArray(q.options) || q.options.length !== 3) return false;
    const doshas = new Set(q.options.map((option) => {
      if (!option || typeof option !== "object") return "";
      return String((option as { dosha?: unknown }).dosha || "");
    }));
    return doshas.has("vata") && doshas.has("pitta") && doshas.has("kapha");
  });
}

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

const herbImageMap = herbImages as Record<string, string[]>;
const herbAliases: Array<[string, string]> = [
  ["ashwagandha", "ashwagandha"],
  ["ashvgandha", "ashwagandha"],
  ["ashvagandha", "ashwagandha"],
  ["aswagandha", "ashwagandha"],
  ["ashwaganda", "ashwagandha"],
  ["tulsi", "tulasi"],
  ["tulasi", "tulasi"],
  ["holy basil", "tulasi"],
  ["turmeric", "turmeric"],
  ["haldi", "turmeric"],
  ["haridra", "haridra"],
  ["neem", "neem"],
  ["amla", "amalaki"],
  ["amalaki", "amalaki"],
  ["giloy", "guduchi"],
  ["guduchi", "guduchi"],
  ["brahmi", "brahmi"],
  ["shatavari", "shatavari"],
  ["triphala", "triphala"],
  ["saffron", "saffron"],
  ["kesar", "saffron"],
];

function localHerbPhotos(text: string): UnsplashPhoto[] {
  const lowered = text.toLowerCase();
  const match = herbAliases.find(([alias, key]) => lowered.includes(alias) && herbImageMap[key]?.length);
  if (!match) return [];
  const [, key] = match;
  const label = key === "tulasi" ? "Tulsi" : key.charAt(0).toUpperCase() + key.slice(1);
  return herbImageMap[key].slice(0, 3).map((url, index) => ({
    id: `local-${key}-${index}`,
    url,
    thumb_url: url,
    alt: `${label} herb image`,
    photographer: "Vaidya AI herb library",
    photographer_url: "",
    unsplash_url: url,
  }));
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
  const bootStartedRef = useRef(false);
  const creatingSessionRef = useRef<Promise<string> | null>(null);
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
  const [doshaQuiz, setDoshaQuiz] = useState<DoshaQuizState | null>(null);

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
    setDoshaQuiz(null);
  }, []);

  const createSession = useCallback(async (authToken: string) => {
    if (creatingSessionRef.current) return creatingSessionRef.current;
    creatingSessionRef.current = (async () => {
    const created = await postJson<{ id: string }>("/sessions/", {}, authToken);
    setActiveSessionId(created.id);
    setMessages([]);
    setDoshaQuiz(null);
    await refreshSessions(authToken);
    return created.id;
    })();
    try {
      return await creatingSessionRef.current;
    } finally {
      creatingSessionRef.current = null;
    }
  }, [refreshSessions]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;
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
    setDoshaQuiz(null);
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
          setDoshaQuiz(null);
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
      if (message.content.toLowerCase().startsWith("i can only help with ayurveda")) return;
      const localPhotos = localHerbPhotos(`${userText}\n${message.content}`);
      if (localPhotos.length) {
        setPhotosByMessageId((prev) => ({ ...prev, [message.id]: localPhotos }));
        return;
      }
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

  const startDoshaQuiz = useCallback(async (content = "Analyze my Dosha") => {
    const now = new Date();
    setError("");
    setAbortController(null);
    setPhotosByMessageId({});
    setIsTyping(true);
    setAgentSteps([
      { key: "understand", label: "Preparing Dosha questions" },
      { key: "context", label: "Generating MCQ cards" },
      { key: "answer", label: "Building quiz" },
    ]);
    setMessages((prev) => [
      ...prev,
      {
        id: `dosha-user-${Date.now()}`,
        role: "user",
        content,
        timestamp: now,
      },
      {
        id: `dosha-assistant-${Date.now()}`,
        role: "assistant",
        content: "Sure. I will generate 12 MCQ cards for your Dosha analysis, then calculate your Vata, Pitta, and Kapha balance.",
        timestamp: now,
      },
    ]);
    try {
      const generatedQuestions = await withFreshToken((freshToken) =>
        generateQuiz(
          {
            count: CHAT_DOSHA_QUESTION_COUNT,
            focus: "chat dosha analysis with body, digestion, emotions, sleep, energy, and lifestyle",
          },
          freshToken
        )
      );
      setDoshaQuiz({
        active: true,
        questions: generatedQuestions.length ? generatedQuestions : FALLBACK_DOSHA_QUESTIONS,
        currentIndex: 0,
        answers: {},
      });
    } catch {
      setError("I could not generate fresh Dosha questions, so I started the fallback MCQ set.");
      setDoshaQuiz({
        active: true,
        questions: FALLBACK_DOSHA_QUESTIONS,
        currentIndex: 0,
        answers: {},
      });
    } finally {
      setIsTyping(false);
      setAgentSteps([]);
    }
  }, [withFreshToken]);

  const handleDoshaSelect = useCallback((dosha: Dosha) => {
    setDoshaQuiz((prev) => {
      if (!prev?.active) return prev;
      const question = prev.questions[prev.currentIndex];
      if (!question) return prev;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [question.id]: dosha,
        },
      };
    });
  }, []);

  const handleDoshaBack = useCallback(() => {
    setDoshaQuiz((prev) => {
      if (!prev?.active) return prev;
      return { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) };
    });
  }, []);

  const handleDoshaCancel = useCallback(() => {
    setDoshaQuiz(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `dosha-cancel-${Date.now()}`,
        role: "assistant",
        content: "No problem. I stopped the Dosha analysis flow.",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleDoshaNext = useCallback(async () => {
    const quiz = doshaQuiz;
    if (!quiz?.active || quiz.saving) return;
    const question = quiz.questions[quiz.currentIndex];
    if (!question || !quiz.answers[question.id]) return;
    if (quiz.currentIndex < quiz.questions.length - 1) {
      setDoshaQuiz((prev) => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : prev);
      return;
    }

    setDoshaQuiz((prev) => prev ? { ...prev, saving: true } : prev);
    const result = calculateResults(quiz.answers);
    let saved = false;
    try {
      await withFreshToken((freshToken) =>
        savePrakritiResult(
          {
            mode: "chat-mcq",
            question_count: quiz.questions.length,
            prakriti_name: result.prakritiName,
            primary_dosha: result.primary,
            secondary_dosha: result.secondary,
            vata_pct: result.percentages.vata,
            pitta_pct: result.percentages.pitta,
            kapha_pct: result.percentages.kapha,
            answers_json: answersForHistory(quiz) as unknown as Record<string, string>,
            focus_area: "chat",
          },
          freshToken
        )
      );
      saved = true;
    } catch {
      saved = false;
      setError("Dosha analysis is ready, but I could not save it to Prakriti history.");
    }

    const analysis = buildDoshaAnalysisMessage(quiz.answers, saved);
    setDoshaQuiz(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `dosha-result-${Date.now()}`,
        role: "assistant",
        content: analysis,
        timestamp: new Date(),
      },
    ]);
    speak(analysis);
  }, [doshaQuiz, speak, withFreshToken]);

  const handleSend = useCallback(async (text: string, files?: File[]) => {
    const content = text.trim() || (files?.length ? "Please help me with the attached file(s)." : "");
    if (!content || isTyping) return;
    if (!files?.length && isDoshaAnalysisTrigger(content)) {
      startDoshaQuiz(content);
      return;
    }
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
  }, [activeSessionId, isTyping, createSession, loadMessages, refreshSessions, speak, loadUnsplashForMessage, withFreshToken, friendlyError, startDoshaQuiz]);

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
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            token={token}
            agentSteps={agentSteps}
            photosByMessageId={photosByMessageId}
            doshaQuiz={doshaQuiz}
            onSuggestionClick={handleSuggestionClick}
            onDoshaSelect={handleDoshaSelect}
            onDoshaNext={handleDoshaNext}
            onDoshaBack={handleDoshaBack}
            onDoshaCancel={handleDoshaCancel}
          />
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
