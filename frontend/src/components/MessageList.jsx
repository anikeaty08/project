import { useEffect, useRef } from "react";

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function MessageList({ messages, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="message-list" role="log" aria-live="polite">
      {messages.length === 0 && !loading ? (
        <div className="empty-state">
          <p className="empty-state__title">Start the conversation</p>
          <p className="empty-state__text">
            Ask about herbs, doshas, or your indexed books and links. This thread
            is saved in Postgres so you can leave and come back.
          </p>
        </div>
      ) : null}

      {messages.map((m) => (
        <article
          key={m.id}
          className={`bubble bubble--${m.role}`}
        >
          <header className="bubble__meta">
            <span className="bubble__role">
              {m.role === "user" ? "You" : "Assistant"}
            </span>
            <time className="bubble__time" dateTime={m.created_at}>
              {formatTime(m.created_at)}
            </time>
          </header>
          <div className="bubble__body">{m.content}</div>
        </article>
      ))}

      {loading ? (
        <div className="bubble bubble--assistant bubble--pending" aria-busy="true">
          <header className="bubble__meta">
            <span className="bubble__role">Assistant</span>
          </header>
          <div className="bubble__body skeleton-lines">
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line--short" />
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
