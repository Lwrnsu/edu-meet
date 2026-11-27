import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import leaveGroupIcon from "../assets/leave-group.png";

export default function LeaveGroupDialog({ onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useLayoutEffect(() => {
    cancelButtonRef.current?.focus();

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll('button:not([disabled])') ?? [],
    );
    if (!focusableElements.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const focusIsOutsideDialog = !dialogRef.current?.contains(
      document.activeElement,
    );

    if (event.shiftKey && (document.activeElement === firstElement || focusIsOutsideDialog)) {
      event.preventDefault();
      lastElement.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === lastElement || focusIsOutsideDialog)
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  return createPortal(
    <div
      className="communication-leave-backdrop"
      onClick={handleBackdropClick}
    >
      <section
        className="communication-leave-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="communication-leave-dialog-title"
        aria-describedby="communication-leave-dialog-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <img
          className="communication-leave-dialog-icon"
          src={leaveGroupIcon}
          alt=""
          aria-hidden="true"
        />
        <h2
          className="communication-leave-dialog-title"
          id="communication-leave-dialog-title"
        >
          Leave Group
        </h2>
        <p
          className="communication-leave-dialog-description"
          id="communication-leave-dialog-description"
        >
          You won’t receive messages from this group unless someone adds you to
          the chat again.
        </p>
        <div className="communication-leave-dialog-actions">
          <button
            className="communication-leave-dialog-button communication-leave-dialog-confirm"
            type="button"
            onClick={onConfirm}
          >
            Leave
          </button>
          <button
            className="communication-leave-dialog-button communication-leave-dialog-cancel"
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
