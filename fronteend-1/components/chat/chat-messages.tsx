"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Leaf, Sparkles, MessageSquare, BookOpen, Heart, Search, Brain, ShieldCheck, Copy, Check } from "lucide-react";
import { fetchAuthedBlob, type AgentStep, type MessageItem, type SourceItem, type UnsplashPhoto } from "@/lib/rag-api";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { type Dosha, type QuizQuestion } from "@/lib/prakriti-data";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceItem[] | null;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  token: string;
  agentSteps?: AgentStep[];
  photosByMessageId?: Record<string, UnsplashPhoto[]>;
  doshaQuiz?: DoshaQuizState | null;
  onSuggestionClick: (text: string) => void;
  onDoshaSelect?: (dosha: Dosha) => void;
  onDoshaNext?: () => void;
  onDoshaBack?: () => void;
  onDoshaCancel?: () => void;
}

export interface DoshaQuizState {
  active: boolean;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<number, Dosha>;
  saving?: boolean;
}

export function fromApiMessage(message: MessageItem): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.created_at),
    sources: message.sources,
  };
}

const suggestions = [
  { icon: Sparkles, title: "Analyze my Dosha", description: "Discover your Ayurvedic constitution" },
  { icon: Leaf, title: "Tell me about Ashwagandha", description: "Benefits, uses, and precautions" },
  { icon: Heart, title: "Stress relief remedies", description: "Natural herbs for anxiety & calm" },
  { icon: BookOpen, title: "Panchakarma explained", description: "Ancient detox therapy overview" },
];

function TypingIndicator({ agentSteps }: { agentSteps: AgentStep[] }) {
  const iconForStep = (key: string) => {
    if (key === "safety") return ShieldCheck;
    if (key === "answer") return Sparkles;
    if (key === "compare") return Brain;
    if (key === "context") return Search;
    return Brain;
  };
  const steps = agentSteps.length ? agentSteps : [
    { key: "understand", label: "Reading your question" },
    { key: "context", label: "Searching knowledge" },
    { key: "answer", label: "Preparing answer" },
  ];
  return (
    <div className="flex items-start gap-3 msg-enter">
      <div className="w-8 h-8 rounded-full bg-ayur-gold/15 flex items-center justify-center flex-shrink-0">
        <Leaf className="w-4 h-4 text-ayur-gold" />
      </div>
      <div className="bg-chat-ai-bg rounded-2xl rounded-tl-sm px-4 py-3 space-y-3 min-w-[260px]">
        <div className="flex items-center gap-2 text-sm text-foreground/90">
          <span className="w-2 h-2 rounded-full bg-ayur-gold animate-pulse" />
          Vaidya is thinking
        </div>
        <div className="grid gap-2">
          {steps.map((step) => {
            const StepIcon = iconForStep(step.key);
            return (
            <div key={step.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <StepIcon className="w-3.5 h-3.5 text-ayur-gold/70" />
              <span>{step.label}</span>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}

function DoshaQuizCard({
  quiz,
  onSelect,
  onNext,
  onBack,
  onCancel,
}: {
  quiz: DoshaQuizState;
  onSelect: (dosha: Dosha) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  const question = quiz.questions[quiz.currentIndex];
  const total = quiz.questions.length;
  const selected = question ? quiz.answers[question.id] : undefined;
  const progress = total ? ((quiz.currentIndex + 1) / total) * 100 : 0;
  const isLast = quiz.currentIndex === total - 1;
  const optionTone: Record<Dosha, string> = {
    vata: "border-blue-400/40 bg-blue-400/10",
    pitta: "border-red-400/40 bg-red-400/10",
    kapha: "border-green-400/40 bg-green-400/10",
  };

  if (!question) return null;

  return (
    <div className="flex items-start gap-3 msg-enter">
      <div className="w-8 h-8 rounded-full bg-ayur-gold/15 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-ayur-gold" />
      </div>
      <div className="w-full max-w-[75%] rounded-2xl rounded-tl-sm bg-chat-ai-bg border border-white/10 px-4 py-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-muted-foreground">
            <span>Question {quiz.currentIndex + 1} of {total}</span>
            <span className="text-ayur-gold truncate">{question.category}</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-ayur-gold to-ayur-amber transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div>
          <p className="text-lg font-display leading-snug text-foreground">{question.question}</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose the answer that feels most naturally true for you.</p>
        </div>

        <div className="grid gap-2">
          {question.options.map((option) => {
            const isSelected = selected === option.dosha;
            return (
              <button
                key={`${question.id}-${option.dosha}`}
                type="button"
                onClick={() => onSelect(option.dosha)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${isSelected ? optionTone[option.dosha] : "border-border/30 bg-white/[0.02] hover:border-border/60 hover:bg-white/[0.04]"}`}
              >
                <span className="flex items-start gap-3">
                  <span className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${isSelected ? "border-ayur-gold bg-ayur-gold" : "border-border/60"}`} />
                  <span className={`text-sm leading-relaxed ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{option.text}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={onBack} disabled={quiz.currentIndex === 0 || quiz.saving} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35">
            <ChevronLeft className="w-3.5 h-3.5" />Back
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} disabled={quiz.saving} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-35">
              Cancel
            </button>
            <button type="button" onClick={onNext} disabled={!selected || quiz.saving} className="inline-flex items-center gap-1.5 rounded-lg bg-ayur-gold px-4 py-2 text-xs font-medium text-background hover:bg-ayur-amber disabled:cursor-not-allowed disabled:opacity-45">
              {quiz.saving ? "Saving..." : isLast ? "Analyze My Dosha" : "Next"}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ file, token }: { file: SourceItem; token: string }) {
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!file.url || !token || !file.mime_type?.startsWith("image/")) return;
    fetchAuthedBlob(file.url, token)
      .then((url) => {
        if (!cancelled) setBlobUrl(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [file.url, file.mime_type, token]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-xs">
      {file.mime_type?.startsWith("image/") ? (
        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center overflow-hidden">
          {blobUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blobUrl} alt={file.filename || "Upload"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-[8px]">IMG</span>
          )}
        </div>
      ) : (
        <div className="w-10 h-10 rounded bg-ayur-gold/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-ayur-gold" />
        </div>
      )}
      <div>
        <p className="text-foreground truncate max-w-[120px]">{file.filename || "Uploaded file"}</p>
        <p className="text-muted-foreground text-[10px]">{file.status || file.mime_type?.split("/")[1]?.toUpperCase()}</p>
      </div>
    </div>
  );
}

function UnsplashStrip({ photos }: { photos: UnsplashPhoto[] }) {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
      {photos.map((photo) => (
        <a key={photo.id} href={photo.unsplash_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg bg-white/5 border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.thumb_url || photo.url} alt={photo.alt} className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="px-2 py-1 text-[10px] text-muted-foreground truncate">
            {photo.photographer ? `Photo by ${photo.photographer}` : "Unsplash"}
          </div>
        </a>
      ))}
    </div>
  );
}

function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Copy answer">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function sourceName(source?: string) {
  if (!source) return "Retrieved source";
  if (source.startsWith("http")) {
    try {
      return new URL(source).hostname.replace(/^www\./, "");
    } catch {
      return source;
    }
  }
  const clean = source.replaceAll("\\", "/");
  const name = clean.split("/").filter(Boolean).pop() || source;
  if (name === "book.txt") return "Ayurveda Encyclopedia";
  if (name === "herb.json") return "Herb database";
  return name;
}

function CitationSources({ sources, messageId }: { sources: SourceItem[]; messageId: string }) {
  const [open, setOpen] = useState(false);
  const citations = (sources || [])
    .filter((source) => source.type !== "attachment")
    .filter((source) => source.rank && source.snippet)
    .slice(0, 4);

  if (!citations.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpen className="w-3 h-3 text-ayur-gold" />
          Citations
          <span className="rounded-full bg-white/5 px-2 py-0.5 tracking-normal text-[10px] text-foreground/70">
            {citations.length}
          </span>
        </span>
        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {open ? "Hide" : "Show"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      <div className="flex flex-wrap gap-1.5">
        {citations.map((source) => (
          <a
            key={`quick-${source.rank}`}
            href={`#${messageId}-source-${source.rank}`}
            onClick={() => setOpen(true)}
            className="inline-flex h-6 items-center rounded-full border border-white/10 bg-background/35 px-2 text-[10px] font-mono text-ayur-gold hover:border-ayur-gold/40"
          >
            ^{source.rank}
          </a>
        ))}
      </div>

      {open && <div className="grid gap-2 pt-1">
        {citations.map((source) => {
          const id = `${messageId}-source-${source.rank}`;
          const label = sourceName(source.source);
          const content = (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ayur-gold/15 px-1.5 text-[10px] font-mono text-ayur-gold">
                  ^{source.rank}
                </span>
                <span className="truncate text-xs font-medium text-foreground">{label}</span>
                {source.source_type && <span className="text-[10px] text-muted-foreground">{source.source_type}</span>}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{source.snippet}</p>
            </>
          );

          if (source.source?.startsWith("http")) {
            return (
              <a id={id} key={id} href={source.source} target="_blank" rel="noreferrer" className="block rounded-lg border border-white/5 bg-background/35 p-2 hover:border-ayur-gold/40 transition-colors scroll-mt-24">
                {content}
              </a>
            );
          }
          return (
            <div id={id} key={id} className="rounded-lg border border-white/5 bg-background/35 p-2 scroll-mt-24">
              {content}
            </div>
          );
        })}
      </div>}
    </div>
  );
}

function MessageBubble({ message, token, photos }: { message: ChatMessage; token: string; photos?: UnsplashPhoto[] }) {
  const isUser = message.role === "user";
  const attachments = (message.sources || []).filter((source) => source.type === "attachment");
  const citationBaseId = `${message.id}-source`;

  return (
    <div className={`flex items-start gap-3 msg-enter ${isUser ? "flex-row-reverse" : ""}`}>
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
        {attachments.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isUser ? "justify-end" : ""}`}>
            {attachments.map((file) => (
              <AttachmentPreview key={file.upload_id || file.url} file={file} token={token} />
            ))}
          </div>
        )}

        {!isUser && photos && <UnsplashStrip photos={photos} />}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-chat-user-bg rounded-tr-sm text-foreground whitespace-pre-wrap" : "bg-chat-ai-bg rounded-tl-sm text-foreground/90"}`}>
          {isUser ? message.content : <MarkdownRenderer content={message.content} citationBaseId={citationBaseId} />}
        </div>
        {!isUser && <CitationSources sources={message.sources || []} messageId={message.id} />}
        {!isUser && <MessageActions text={message.content} />}

        <p className={`text-[10px] text-muted-foreground/50 font-mono px-1 ${isUser ? "text-right" : ""}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  isTyping,
  token,
  agentSteps = [],
  photosByMessageId = {},
  doshaQuiz,
  onSuggestionClick,
  onDoshaSelect,
  onDoshaNext,
  onDoshaBack,
  onDoshaCancel,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, doshaQuiz?.currentIndex]);

  if (messages.length === 0 && !isTyping && !doshaQuiz?.active) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass-card-strong mb-6 float-subtle">
            <Leaf className="w-10 h-10 text-ayur-gold" />
          </div>
          <h2 className="text-2xl font-display tracking-tight mb-2">How can I help you today?</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Ask about Ayurvedic herbs, doshas, remedies, uploads, or plant images.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
          {suggestions.map((s) => (
            <button key={s.title} onClick={() => onSuggestionClick(s.title)} className="group glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-all duration-300 hover:border-ayur-gold/20">
              <div className="flex items-start gap-3">
                <s.icon className="w-4 h-4 text-ayur-gold/70 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium group-hover:text-ayur-gold transition-colors">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-12 text-[10px] font-mono text-muted-foreground/40 flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          Connected to your RAG backend
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} token={token} photos={photosByMessageId[msg.id]} />
        ))}
        {doshaQuiz?.active && onDoshaSelect && onDoshaNext && onDoshaBack && onDoshaCancel && (
          <DoshaQuizCard
            quiz={doshaQuiz}
            onSelect={onDoshaSelect}
            onNext={onDoshaNext}
            onBack={onDoshaBack}
            onCancel={onDoshaCancel}
          />
        )}
        {isTyping && <TypingIndicator agentSteps={agentSteps} />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
