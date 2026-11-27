import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import doubleTickIcon from "../assets/double-tick.png";
import menuIcon from "../assets/menu-vertical.png";
import pushPinIcon from "../assets/push-pin.png";

export default function MessageBubble({
  message,
  isOutgoing,
  isLast,
  isPinned = false,
  openMessageMenuId,
  onOpenMessageMenu,
  onCloseMessageMenu,
  onTogglePin,
}) {
  const status = message.status === "double-tick" && !message.isLocal;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const isMenuOpen = openMessageMenuId === message.id;

  useLayoutEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const padding = 8;
      const maxLeft = Math.max(
        padding,
        window.innerWidth - menuRect.width - padding,
      );
      const maxTop = Math.max(
        padding,
        window.innerHeight - menuRect.height - padding,
      );
      const left = Math.max(
        padding,
        Math.min(
          isOutgoing ? triggerRect.left - menuRect.width : triggerRect.right,
          maxLeft,
        ),
      );
      const top = Math.max(
        padding,
        Math.min(triggerRect.bottom + 4, maxTop),
      );

      setMenuPosition((current) =>
        current?.left === left && current?.top === top
          ? current
          : { left, top },
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isMenuOpen, isOutgoing]);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        onCloseMessageMenu?.();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMessageMenu?.();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, onCloseMessageMenu]);

  useEffect(() => {
    if (isMenuOpen && menuPosition) {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    }
  }, [isMenuOpen, menuPosition]);

  return (
    <li
      className="communication-message-bubble-row"
      data-message-id={message.id}
    >
      {isOutgoing && (
        <span className="communication-message-controls communication-message-controls--outgoing">
          <button
            className="communication-message-menu-trigger"
            type="button"
            ref={triggerRef}
            aria-label="Outgoing message actions"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() =>
              isMenuOpen
                ? onCloseMessageMenu?.()
                : onOpenMessageMenu?.(message.id)
            }
          >
            <img src={menuIcon} alt="" aria-hidden="true" />
          </button>
          {isPinned && (
            <img
              className="communication-message-pin"
              src={pushPinIcon}
              alt="Pinned message"
            />
          )}
        </span>
      )}
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
      <div
        className={`communication-message-bubble communication-message-bubble--${isOutgoing ? "outgoing" : "incoming"}`}
      >
        <p className="communication-message-text">{message.text}</p>
      </div>
      {!isOutgoing && (
        <span className="communication-message-controls communication-message-controls--incoming">
          {isPinned && (
            <img
              className="communication-message-pin"
              src={pushPinIcon}
              alt="Pinned message"
            />
          )}
          <button
            className="communication-message-menu-trigger"
            type="button"
            ref={triggerRef}
            aria-label="Incoming message actions"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() =>
              isMenuOpen
                ? onCloseMessageMenu?.()
                : onOpenMessageMenu?.(message.id)
            }
          >
            <img src={menuIcon} alt="" aria-hidden="true" />
          </button>
        </span>
      )}
      {!isOutgoing && isLast && (
        <time
          className="communication-message-metadata"
          dateTime={message.createdAt}
        >
          {message.timestamp}
        </time>
      )}
      {isMenuOpen &&
        createPortal(
          <div
            className="communication-message-action-menu"
            ref={menuRef}
            role="menu"
            aria-label="Message actions"
            style={{
              left: menuPosition?.left ?? 0,
              top: menuPosition?.top ?? 0,
              visibility: menuPosition ? "visible" : "hidden",
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onTogglePin?.(message.id);
                onCloseMessageMenu?.();
              }}
            >
              <img src={pushPinIcon} alt="" aria-hidden="true" />
              <span>{isPinned ? "Unpin Message" : "Pin Message"}</span>
            </button>
          </div>,
          document.body,
        )}
    </li>
  );
}
