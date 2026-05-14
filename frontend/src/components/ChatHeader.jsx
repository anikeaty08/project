export default function ChatHeader({
  language,
  onLanguageChange,
  onNewChat,
  onIngest,
  ingesting,
}) {
  return (
    <header className="chat-header">
      <div className="chat-header__brand">
        <span className="chat-header__logo" aria-hidden>
          ◆
        </span>
        <div>
          <h1 className="chat-header__title">Herb &amp; source assistant</h1>
          <p className="chat-header__subtitle">
            RAG with session memory · grounded answers
          </p>
        </div>
      </div>
      <div className="chat-header__actions">
        <label className="field-label">
          <span className="field-label__text">Language</span>
          <select
            className="select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            <option value="">Auto</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="bn">Bengali</option>
            <option value="mr">Marathi</option>
            <option value="gu">Gujarati</option>
            <option value="kn">Kannada</option>
            <option value="ml">Malayalam</option>
            <option value="pa">Punjabi</option>
            <option value="ur">Urdu</option>
          </select>
        </label>
        <button type="button" className="btn btn--ghost" onClick={onNewChat}>
          New chat
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={ingesting}
          onClick={onIngest}
        >
          {ingesting ? "Indexing…" : "Re-index"}
        </button>
      </div>
    </header>
  );
}
