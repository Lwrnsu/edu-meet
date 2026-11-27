import { useLayoutEffect, useRef, useState } from "react";

export default function RenameGroupDialog({ name, onSave, onClose }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const saving = useRef(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useLayoutEffect(() => {
    dialog.current.showModal();
    input.current.select();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (saving.current) return;

    const nextName = draft.trim();
    if (!nextName || Array.from(nextName).length > 100) {
      setError("Enter a name between 1 and 100 characters.");
      input.current.focus();
      return;
    }

    saving.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(nextName);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="communication-rename-dialog"
      aria-labelledby="communication-rename-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving.current) onClose();
      }}
    >
      <form onSubmit={submit}>
        <h2 id="communication-rename-title">Rename group</h2>
        <label htmlFor="communication-group-name">Group name</label>
        <input
          ref={input}
          id="communication-group-name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          readOnly={isSaving}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "communication-rename-error" : undefined}
        />
        {error && <p id="communication-rename-error" role="alert">{error}</p>}
        <div className="communication-rename-actions">
          <button className="communication-action-button" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="communication-action-button communication-primary-action" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save name"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
