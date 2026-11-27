import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ChangeGroupNameDialog({
  conversation,
  onCancel,
  onSave,
}) {
  const [name, setName] = useState(conversation?.name ?? "");
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const normalizedName = name.trim();
  const unchanged =
    normalizedName === (conversation?.name ?? "");
  const invalid =
    normalizedName.length === 0 || normalizedName.length > 50;

  useLayoutEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled])',
      ) ?? [],
    );
    if (!focusableElements.length) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (invalid || unchanged) {
      return;
    }
    onSave(normalizedName);
  }

  return createPortal(
    <div
      className="communication-leave-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <form
        className="communication-name-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="communication-name-dialog-title"
        onKeyDown={handleKeyDown}
        onSubmit={handleSubmit}
      >
        <h2
          className="communication-name-dialog-title"
          id="communication-name-dialog-title"
        >
          Change Group Name
        </h2>
        <label className="communication-name-dialog-field">
          <span>Group name</span>
          <input
            ref={inputRef}
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {invalid && (
          <p className="communication-name-dialog-error" role="alert">
            Enter a name between 1 and 50 characters.
          </p>
        )}
        <div className="communication-name-dialog-actions">
          <button
            className="communication-name-dialog-save"
            type="submit"
            disabled={invalid || unchanged}
          >
            Save
          </button>
          <button
            className="communication-name-dialog-cancel"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
