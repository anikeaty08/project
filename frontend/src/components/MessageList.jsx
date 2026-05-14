import { useEffect, useRef } from "react";
import InlineImageResults from "./InlineImageResults.jsx";
import { apiUrlWithOwner } from "../api/client.js";

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

export default function MessageList({ messages, loading, ownerToken }) {
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
          {Array.isArray(m.sources) && m.sources.some((s) => s.type === "attachment") ? (
            <div className="bubble__attachments" aria-label="Attachments">
              {m.sources
                .filter((s) => s.type === "attachment")
                .map((a) => (
                  <a
                    key={a.upload_id || a.url}
                    className="bubble__attachment"
                    href={apiUrlWithOwner(a.url, ownerToken)}
                    target="_blank"
                    rel="noreferrer"
                    title={a.filename}
                  >
                    {String(a.mime_type || "").startsWith("image/") ? (
                      <img
                        className="bubble__attachment-img"
                        src={apiUrlWithOwner(a.url, ownerToken)}
                        alt={a.filename || "Uploaded image"}
                      />
                    ) : (
                      <span className="bubble__attachment-doc">
                        {a.filename || "Uploaded file"}
                      </span>
                    )}
                  </a>
                ))}
            </div>
          ) : null}
          {m.role === "assistant" ? (
            <InlineImageResults assistantText={m.content} />
          ) : null}
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
