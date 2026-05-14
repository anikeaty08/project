export default function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onNew,
}) {
  return (
    <aside className="sidebar" aria-label="Chat sessions">
      <div className="sidebar__head">
        <span className="sidebar__title">Sessions</span>
        <button type="button" className="btn btn--small btn--ghost" onClick={onNew}>
          + New
        </button>
      </div>
      <ul className="sidebar__list">
        {sessions.map((s) => (
          <li key={s.id} className="sidebar__row">
            <button
              type="button"
              className={
                "sidebar__item" +
                (s.id === activeSessionId ? " sidebar__item--active" : "")
              }
              onClick={() => onSelect(s.id)}
            >
              <span className="sidebar__item-title">
                {s.title?.trim() || "Untitled chat"}
              </span>
              <span className="sidebar__item-meta">
                {new Date(s.updated_at || s.created_at).toLocaleString()}
              </span>
            </button>
            <button
              type="button"
              className="sidebar__delete"
              aria-label={`Delete ${s.title?.trim() || "chat"}`}
              title="Delete chat"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(s.id);
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
