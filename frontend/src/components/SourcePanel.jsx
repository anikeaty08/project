export default function SourcePanel({ sources }) {
  if (!sources?.length) return null;

  return (
    <section className="source-panel" aria-label="Retrieved sources">
      <details open={false}>
        <summary className="source-panel__summary">
          Sources used ({sources.length})
        </summary>
        <ol className="source-panel__list">
          {sources.map((s) => (
            <li key={s.rank} className="source-panel__item">
              <span className="source-panel__rank">[{s.rank}]</span>{" "}
              <span className="source-panel__src">{s.source}</span>
              {s.snippet ? (
                <div className="source-panel__snippet">{s.snippet}…</div>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
