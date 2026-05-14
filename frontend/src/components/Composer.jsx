import { useCallback, useRef, useState } from "react";

const ACCEPT =
  "application/pdf,image/png,image/jpeg,image/webp,text/plain,text/markdown,.pdf,.png,.jpg,.jpeg,.webp,.txt,.md";

export default function Composer({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((fileList) => {
    const next = Array.from(fileList || []).filter(Boolean);
    if (!next.length) return;
    setPendingFiles((prev) => [...prev, ...next].slice(0, 12));
  }, []);

  const removeFile = useCallback((index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const submit = useCallback(async () => {
    if (disabled) return;
    const trimmed = value.trim();
    const files = pendingFiles.slice();
    if (!trimmed && !files.length) return;
    const message =
      trimmed ||
      (files.length ? "Please help me with the attached file(s)." : "");
    await onSend(message, files);
    setValue("");
    setPendingFiles([]);
  }, [value, pendingFiles, disabled, onSend]);

  const canSend = !disabled && (!!value.trim() || pendingFiles.length > 0);

  return (
    <div className="composer">
      <input
        ref={fileInputRef}
        type="file"
        className="composer__file-input"
        multiple
        accept={ACCEPT}
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {pendingFiles.length > 0 ? (
        <div className="composer__chips" aria-label="Attachments">
          {pendingFiles.map((f, i) => (
            <span key={`${f.name}-${i}`} className="composer__chip">
              <span className="composer__chip-name" title={f.name}>
                {f.name}
              </span>
              <button
                type="button"
                className="composer__chip-remove"
                aria-label={`Remove ${f.name}`}
                onClick={() => removeFile(i)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="composer__row">
        <button
          type="button"
          className="btn composer__attach"
          disabled={disabled}
          aria-label="Attach images or documents"
          title="Attach images or documents"
          onClick={() => fileInputRef.current?.click()}
        >
          +
        </button>
        <textarea
          className="composer__input"
          rows={2}
          value={value}
          disabled={disabled}
          placeholder="Message… (Enter to send, Shift+Enter for newline)"
          aria-label="Message"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="btn btn--primary composer__send"
          disabled={!canSend}
          onClick={submit}
        >
          Send
        </button>
      </div>
    </div>
  );
}
