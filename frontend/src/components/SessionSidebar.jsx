export default function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
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
          <li key={s.id}>
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
          </li>
        ))}
      </ul>
    </aside>
  );
}
