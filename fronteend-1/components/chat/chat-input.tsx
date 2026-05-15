"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Paperclip, Mic, MicOff, Send, X, FileText, ImageIcon, Square } from "lucide-react";

interface FilePreview {
  file: File;
  url?: string;
}

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => Promise<void> | void;
  onStop?: () => void;
  disabled?: boolean;
  isThinking?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isThinking }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      files.forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
    };
  }, [files]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (isThinking) {
      onStop?.();
      return;
    }
    if ((!trimmed && files.length === 0) || disabled) return;
    const selectedFiles = files.map((f) => f.file);
    setInput("");
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    files.forEach((f) => {
      if (f.url) URL.revokeObjectURL(f.url);
    });
    await onSend(trimmed, selectedFiles.length > 0 ? selectedFiles : undefined);
  }, [input, files, onSend, disabled, isThinking, onStop]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const next = Array.from(selected).map((file) => ({
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setFiles((prev) => [...prev, ...next].slice(0, 12));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    recognition.onend = () => {
      setIsRecording(false);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasContent = input.trim().length > 0 || files.length > 0;

  return (
    <div className="relative z-10 pb-4 px-4">
      <div className="max-w-3xl mx-auto">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-xl glass-card">
            {files.map((f, i) => (
              <div key={`${f.file.name}-${i}`} className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-border/30">
                {f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.file.name} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded bg-ayur-gold/10 flex items-center justify-center">
                    {f.file.type.includes("pdf") ? <FileText className="w-4 h-4 text-ayur-gold" /> : <ImageIcon className="w-4 h-4 text-ayur-gold" />}
                  </div>
                )}
                <div className="max-w-[120px]">
                  <p className="text-xs truncate">{f.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(f.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => removeFile(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative glass-card-strong rounded-2xl transition-all duration-300 focus-within:shadow-[0_0_0_1px_rgba(201,169,110,0.2)]">
          {isRecording && (
            <div className="flex items-center gap-3 px-4 pt-3 pb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-mono">Recording {formatTime(recordingTime)}</span>
            </div>
          )}

          <div className="flex items-end gap-2 p-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={disabled} className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 mb-0.5" aria-label="Attach file">
              <Paperclip className="w-5 h-5" />
            </button>
            <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp,text/plain,text/markdown,.pdf,.png,.jpg,.jpeg,.webp,.txt,.md" onChange={handleFileSelect} className="hidden" />

            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={disabled} placeholder="Ask about Ayurvedic herbs, doshas, remedies..." rows={1} className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/50 leading-relaxed max-h-[200px] py-1.5" />

            <button onClick={toggleRecording} disabled={disabled} className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 mb-0.5 ${isRecording ? "bg-red-500/20 text-red-400 mic-pulse" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} aria-label={isRecording ? "Stop recording" : "Start recording"}>
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button onClick={handleSend} disabled={!isThinking && (!hasContent || disabled)} className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 mb-0.5 ${isThinking ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : hasContent ? "bg-ayur-gold text-background hover:bg-ayur-amber" : "bg-white/5 text-muted-foreground/30 cursor-not-allowed"}`} aria-label={isThinking ? "Stop response" : "Send message"}>
              {isThinking ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-2 font-mono">
          Vaidya AI may produce inaccurate information. Always consult a qualified practitioner.
        </p>
      </div>
    </div>
  );
}
