import { useCallback, useEffect, useState } from "react";
import { getJson, postJson, postSessionUploads } from "../api/client.js";

const SESSION_KEY = "rag_chat_session_id";

export function useChatSession() {
  const [booting, setBooting] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("");
  const [lastSources, setLastSources] = useState([]);

  const refreshSessions = useCallback(async () => {
    const list = await getJson("/sessions/");
    setSessions(list);
  }, []);

  const loadMessages = useCallback(async (sid) => {
    const msgs = await getJson(`/sessions/${sid}/messages`);
    setMessages(msgs);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBooting(true);
      setError("");
      try {
        await refreshSessions();
        let sid = localStorage.getItem(SESSION_KEY);
        if (sid) {
          try {
            await loadMessages(sid);
            if (!cancelled) setSessionId(sid);
            return;
          } catch {
            localStorage.removeItem(SESSION_KEY);
          }
        }
        const created = await postJson("/sessions/", {});
        localStorage.setItem(SESSION_KEY, created.id);
        if (!cancelled) {
          setSessionId(created.id);
          setMessages([]);
        }
        await refreshSessions();
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadMessages, refreshSessions]);

  const newChat = useCallback(async () => {
    setError("");
    try {
      const created = await postJson("/sessions/", {});
      localStorage.setItem(SESSION_KEY, created.id);
      setSessionId(created.id);
      setMessages([]);
      setLastSources([]);
      await refreshSessions();
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [refreshSessions]);

  const openSession = useCallback(
    async (sid) => {
      setError("");
      try {
        localStorage.setItem(SESSION_KEY, sid);
        setSessionId(sid);
        await loadMessages(sid);
      } catch (e) {
        setError(e.message || String(e));
      }
    },
    [loadMessages]
  );

  const sendMessage = useCallback(
    async (text, files = []) => {
      const list = Array.isArray(files) ? files : [];
      const trimmed = (text || "").trim();
      const fallback =
        list.length > 0 ? "Please help me with the attached file(s)." : "";
      const content = trimmed || fallback;
      if (!content || !sessionId || loading) return;
      setError("");
      setLoading(true);
      try {
        const lang = language.trim() || null;
        let uploadIds = null;
        if (list.length > 0) {
          const uploaded = await postSessionUploads(sessionId, list);
          uploadIds = uploaded.map((u) => u.id);
        }
        const data = await postJson(`/sessions/${sessionId}/chat/`, {
          content,
          language: lang,
          upload_ids: uploadIds,
        });
        setLastSources(data.sources || []);
        await loadMessages(sessionId);
        await refreshSessions();
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading, language, loadMessages, refreshSessions]
  );

  const runIngest = useCallback(async () => {
    setIngesting(true);
    setError("");
    try {
      const token = import.meta.env.VITE_INGEST_TOKEN;
      const headers = token ? { "X-Ingest-Token": token } : {};
      await postJson("/ingest/", { clear: true, url_limit: null }, headers);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setIngesting(false);
    }
  }, []);

  return {
    booting,
    sessionId,
    sessions,
    messages,
    loading,
    ingesting,
    error,
    setError,
    language,
    setLanguage,
    lastSources,
    newChat,
    openSession,
    sendMessage,
    runIngest,
    refreshSessions,
  };
}
