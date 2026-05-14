import { useCallback, useState } from "react";

export default function Composer({ onSend, disabled }) {
  const [value, setValue] = useState("");

  const submit = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  }, [value, disabled, onSend]);

  return (
    <div className="composer">
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
        disabled={disabled || !value.trim()}
        onClick={submit}
      >
        Send
      </button>
    </div>
  );
}
