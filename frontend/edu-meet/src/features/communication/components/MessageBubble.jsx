import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MessageAttachment from "./MessageAttachment.jsx";
import doubleTickIcon from "../assets/double-tick.png";
import menuIcon from "../assets/menu-vertical.png";
import pushPinIcon from "../assets/push-pin.png";

export default function MessageBubble({
  message, isOutgoing, isLast, isPinned, isUpdatingPin, onTogglePin, isMenuOpen, setOpenMessageMenuId,
}) {
  const status = message.status === "double-tick" && !message.isLocal;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const menuOpen = isMenuOpen && Boolean(onTogglePin);
  const menuPositioned = menuPosition !== null;

  useLayoutEffect(() => {
    if (!menuOpen) return;

    function updatePosition() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!trigger || !menu) return;
      const padding = 8;
      const left = Math.max(padding, Math.min(
        isOutgoing ? trigger.left - menu.width : trigger.right,
        window.innerWidth - menu.width - padding,
      ));
      const top = Math.max(padding, Math.min(
        trigger.bottom + 4,
        window.innerHeight - menu.height - padding,
      ));

      setMenuPosition((current) =>
        current?.left === left && current?.top === top ? current : { left, top },
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen, isOutgoing]);

  useLayoutEffect(() => {
    if (menuOpen && menuPositioned) {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    }
  }, [menuOpen, menuPositioned]);

  useEffect(() => {
    if (!menuOpen) return;

    function dismissOutside(event) {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpenMessageMenuId(null);
      }
    }

    function dismissOnEscape(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenMessageMenuId(null);
      triggerRef.current?.focus({ preventScroll: true });
    }

    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [menuOpen, setOpenMessageMenuId]);

  const bubble = (
    <div
      className={`communication-message-bubble communication-message-bubble--${isOutgoing ? "outgoing" : "incoming"}`}
    >
      {message.attachment && <MessageAttachment attachment={message.attachment} />}
      {message.text && <p className="communication-message-text">{message.text}</p>}
    </div>
  );

  return (
    <li className="communication-message-bubble-row" data-message-id={message.id}>
      {isOutgoing && isLast && (
        <div className="communication-message-metadata">
          <time dateTime={message.createdAt}>{message.timestamp}</time>
          {status && (
            <img
              className="communication-message-status"
              src={doubleTickIcon}
              alt=""
              aria-label="Message status"
            />
          )}
        </div>
      )}
      {onTogglePin ? (
        <div className={`communication-message-bubble-with-controls${isOutgoing ? " communication-message-bubble-with-controls--outgoing" : ""}`}>
          {bubble}
          <div className="communication-message-controls">
            <img
              className="communication-message-pin"
              src={pushPinIcon}
              alt="Pinned message"
              style={isPinned ? undefined : { visibility: "hidden" }}
            />
            <button
              className="communication-message-menu-trigger"
              type="button"
              ref={triggerRef}
              aria-label={isOutgoing ? "Outgoing message actions" : "Incoming message actions"}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setOpenMessageMenuId(menuOpen ? null : message.id)}
            >
              <img src={menuIcon} alt="" />
            </button>
          </div>
        </div>
      ) : bubble}
      {!isOutgoing && isLast && (
        <time
          className="communication-message-metadata"
          dateTime={message.createdAt}
        >
          {message.timestamp}
        </time>
      )}
      {menuOpen && createPortal(
        <div
          className="communication-message-action-menu"
          ref={menuRef}
          role="menu"
          aria-label="Message actions"
          style={{
            left: menuPosition?.left ?? 0,
            top: menuPosition?.top ?? 0,
            visibility: menuPositioned ? "visible" : "hidden",
          }}
        >
          <button
            type="button"
            role="menuitem"
            aria-disabled={isUpdatingPin || undefined}
            onClick={() => {
              if (isUpdatingPin) return;
              onTogglePin(message.id);
              setOpenMessageMenuId(null);
              triggerRef.current?.focus({ preventScroll: true });
            }}
          >
            <img src={pushPinIcon} alt="" />
            <span>{isPinned ? "Unpin Message" : "Pin Message"}</span>
          </button>
        </div>,
        document.body,
      )}
    </li>
  );
}
