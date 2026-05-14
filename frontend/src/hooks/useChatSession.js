import { useCallback, useEffect, useState } from "react";
import { deleteJson, getJson, postJson, postSessionUploads } from "../api/client.js";

const SESSION_KEY = "rag_chat_session_id";
const OWNER_PREFIX = "rag_chat_owner_";

function ownerKey(sessionId) {
  return `${OWNER_PREFIX}${sessionId}`;
}

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

  const ownerHeaders = useCallback((sid = sessionId) => {
    const token = sid ? localStorage.getItem(ownerKey(sid)) : "";
    return token ? { "X-Session-Owner": token } : {};
  }, [sessionId]);

  const refreshSessions = useCallback(async () => {
    const list = await getJson("/sessions/");
    setSessions(list);
  }, []);

  const loadMessages = useCallback(async (sid) => {
    const token = localStorage.getItem(ownerKey(sid));
    const headers = token ? { "X-Session-Owner": token } : {};
    const msgs = await getJson(`/sessions/${sid}/messages`, headers);
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
        if (created.owner_token) {
          localStorage.setItem(ownerKey(created.id), created.owner_token);
        }
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
      if (created.owner_token) {
        localStorage.setItem(ownerKey(created.id), created.owner_token);
      }
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

  const deleteSession = useCallback(
    async (sid) => {
      if (!sid) return;
      setError("");
      try {
        await deleteJson(`/sessions/${sid}`, ownerHeaders(sid));
        const nextSessions = sessions.filter((s) => s.id !== sid);
        setSessions(nextSessions);
        if (sid === sessionId) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(ownerKey(sid));
          if (nextSessions.length > 0) {
            const nextId = nextSessions[0].id;
            localStorage.setItem(SESSION_KEY, nextId);
            setSessionId(nextId);
            await loadMessages(nextId);
          } else {
            const created = await postJson("/sessions/", {});
            localStorage.setItem(SESSION_KEY, created.id);
            if (created.owner_token) {
              localStorage.setItem(ownerKey(created.id), created.owner_token);
            }
            setSessionId(created.id);
            setMessages([]);
          }
          setLastSources([]);
        }
        await refreshSessions();
      } catch (e) {
        setError(e.message || String(e));
      }
    },
    [sessionId, sessions, loadMessages, refreshSessions, ownerHeaders]
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
          const uploaded = await postSessionUploads(
            sessionId,
            list,
            content,
            ownerHeaders()
          );
          uploadIds = uploaded.map((u) => u.id);
        }
        const data = await postJson(
          `/sessions/${sessionId}/chat/`,
          {
            content,
            language: lang,
            upload_ids: uploadIds,
          },
          ownerHeaders()
        );
        setLastSources(data.sources || []);
        if (data.user_message && data.assistant_message) {
          setMessages((prev) => [
            ...prev,
            data.user_message,
            data.assistant_message,
          ]);
        } else {
          await loadMessages(sessionId);
        }
        await refreshSessions();
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading, language, loadMessages, refreshSessions, ownerHeaders]
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
    deleteSession,
    sendMessage,
    runIngest,
    refreshSessions,
    ownerHeaders,
  };
}
