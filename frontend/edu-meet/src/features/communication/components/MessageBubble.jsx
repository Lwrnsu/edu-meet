import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MessageAttachment from "./MessageAttachment.jsx";
import MessageText from "./MessageText.jsx";
import doubleTickIcon from "../assets/double-tick.png";
import menuIcon from "../assets/menu-vertical.png";
import pushPinIcon from "../assets/push-pin.png";

export default function MessageBubble({
  message, isOutgoing, isLast, isPinned, isUpdatingPin, onTogglePin, onUnsend,
  isMenuOpen, setOpenMessageMenuId, onOpenMedia,
}) {
  const status = message.status === "double-tick" && !message.isLocal;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const canUnsend = isOutgoing && Boolean(onUnsend) && !message.isLocal;
  const hasActions = Boolean(onTogglePin) || canUnsend;
  const menuOpen = isMenuOpen && hasActions;
  const menuPositioned = menuPosition !== null;

  useLayoutEffect(() => {
    if (!menuOpen) return;

    const trigger = triggerRef.current;
    const menu = menuRef.current;
    const messageArea = trigger?.closest(".communication-message-scroll");
    if (!trigger || !menu || !messageArea) return;

    function dismissMenu() {
      setOpenMessageMenuId(null);
    }

    function updatePosition() {
      const anchor = trigger.getBoundingClientRect();
      const bounds = messageArea.getBoundingClientRect();
      const { width, height } = menu.getBoundingClientRect();
      const padding = 8;
      const minLeft = Math.max(0, bounds.left) + padding;
      const maxRight = Math.min(window.innerWidth, bounds.right) - padding;
      const minTop = Math.max(0, bounds.top) + padding;
      const maxBottom = Math.min(window.innerHeight, bounds.bottom) - padding;

      if (maxRight - minLeft < width || maxBottom - minTop < height ||
        anchor.bottom <= bounds.top || anchor.top >= bounds.bottom) {
        dismissMenu();
        return;
      }

      const left = Math.max(minLeft, Math.min(
        isOutgoing ? anchor.left - width : anchor.right,
        maxRight - width,
      ));
      const below = anchor.bottom + 4;
      const above = anchor.top - 4 - height;
      const preferredTop = below + height <= maxBottom ? below : above;
      const top = Math.max(minTop, Math.min(preferredTop, maxBottom - height));

      setMenuPosition((current) =>
        current?.left === left && current?.top === top ? current : { left, top },
      );
    }

    updatePosition();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(messageArea);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", dismissMenu);
    messageArea.addEventListener("scroll", dismissMenu);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", dismissMenu);
      messageArea.removeEventListener("scroll", dismissMenu);
    };
  }, [menuOpen, isOutgoing, setOpenMessageMenuId]);

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

  function handleMenuNavigation(event) {
    if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
    const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'));
    const current = items.indexOf(document.activeElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    event.preventDefault();
    items[(current + direction + items.length) % items.length]?.focus({ preventScroll: true });
  }

  function confirmUnsend() {
    setOpenMessageMenuId(null);
    if (window.confirm("Unsend this message for everyone?")) onUnsend(message.id);
    triggerRef.current?.focus({ preventScroll: true });
  }

  const bubble = (
    <div
      className={`communication-message-bubble communication-message-bubble--${isOutgoing ? "outgoing" : "incoming"}`}
    >
      {message.attachment && <MessageAttachment attachment={message.attachment} onOpenMedia={onOpenMedia} />}
      <MessageText text={message.text} />
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
      {hasActions ? (
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
          onKeyDown={handleMenuNavigation}
          style={{
            left: menuPosition?.left ?? 0,
            top: menuPosition?.top ?? 0,
            visibility: menuPositioned ? "visible" : "hidden",
          }}
        >
          {onTogglePin && <button
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
          </button>}
          {canUnsend && <button type="button" role="menuitem" onClick={confirmUnsend}>Unsend Message</button>}
        </div>,
        document.body,
      )}
    </li>
  );
}
