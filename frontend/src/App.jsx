import ChatHeader from "./components/ChatHeader.jsx";
import Composer from "./components/Composer.jsx";
import MessageList from "./components/MessageList.jsx";
import SessionSidebar from "./components/SessionSidebar.jsx";
import SourcePanel from "./components/SourcePanel.jsx";
import { useChatSession } from "./hooks/useChatSession.js";
import "./App.css";

export default function App() {
  const {
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
  } = useChatSession();

  if (booting) {
    return (
      <div className="app-shell app-shell--center">
        <div className="spinner" aria-label="Loading" />
        <p className="muted">Connecting to session…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        onSelect={openSession}
        onNew={newChat}
      />
      <div className="app-main">
        <ChatHeader
          language={language}
          onLanguageChange={setLanguage}
          onNewChat={newChat}
          onIngest={runIngest}
          ingesting={ingesting}
        />
        {error ? (
          <div className="banner banner--error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <div className="chat-panel">
          <MessageList messages={messages} loading={loading} />
          <SourcePanel sources={lastSources} />
          <Composer onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
