import { useEffect, useLayoutEffect, useRef, useState } from "react";
import backToChatIcon from "../assets/back-to-chat.png";
import menuIcon from "../assets/menu-vertical.png";
import menuTriggerHighlight from "../assets/menu-trigger-highlight.svg";
import ConversationAvatar from "./ConversationAvatar.jsx";
import ChatOptionsMenu from "./ChatOptionsMenu.jsx";

export default function ChatHeader({
  conversation,
  onMenuAction,
  onBackToChat,
  triggerRef,
  view = "chat",
}) {
  const [openConversationId, setOpenConversationId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const menuAnchorRef = useRef(null);
  const internalMenuTriggerRef = useRef(null);
  const menuTriggerRef = triggerRef ?? internalMenuTriggerRef;
  const menuRef = useRef(null);
  const isMenuOpen =
    view === "chat" &&
    conversation &&
    openConversationId === conversation?.id;
  const previousViewRef = useRef(view);
  const menuId = conversation
    ? `communication-chat-options-${conversation.id}`
    : undefined;

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const trigger = menuTriggerRef.current;

    function handlePointerDown(event) {
      if (!menuAnchorRef.current?.contains(event.target)) {
        setOpenConversationId(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenConversationId(null);
        trigger?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, menuTriggerRef]);

  useLayoutEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    function updateMenuPosition() {
      const trigger = menuTriggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportPadding = 8;
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - menuRect.width - viewportPadding,
      );
      const maxTop = Math.max(
        viewportPadding,
        window.innerHeight - menuRect.height - viewportPadding,
      );
      const left = Math.max(
        viewportPadding,
        Math.min(
          triggerRect.right - 39 - menuRect.width,
          maxLeft,
        ),
      );
      const top = Math.max(
        viewportPadding,
        Math.min(triggerRect.bottom, maxTop),
      );

      setMenuPosition((currentPosition) =>
        currentPosition?.left === left && currentPosition?.top === top
          ? currentPosition
          : { left, top },
      );
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition);
    };
  }, [isMenuOpen, conversation?.id, menuTriggerRef]);

  useLayoutEffect(() => {
    if (isMenuOpen && menuPosition) {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    }
  }, [isMenuOpen, menuPosition]);

  useLayoutEffect(() => {
    if (previousViewRef.current !== "chat" && view === "chat") {
      menuTriggerRef.current?.focus();
    }
    previousViewRef.current = view;
  }, [menuTriggerRef, view]);

  if (!conversation) {
    return null;
  }

  function handleMenuToggle() {
    setOpenConversationId(isMenuOpen ? null : conversation.id);
  }

  function handleMenuAction(action, selectedConversation) {
    if (
      action === "leave-group" ||
      action === "view-members" ||
      action === "pinned-messages"
    ) {
      setOpenConversationId(null);
    }

    onMenuAction?.(action, selectedConversation);
  }

  return (
    <header className="communication-chat-header">
      <div className="communication-chat-identity">
        <ConversationAvatar
          type={conversation.type}
          imageUrl={conversation.avatarUrl}
          size={60}
        />
        <h2 className="communication-chat-name">{conversation.name}</h2>
      </div>
      {view !== "chat" ? (
        <button
          className="communication-chat-back"
          type="button"
          onClick={onBackToChat}
        >
          <img src={backToChatIcon} alt="" aria-hidden="true" />
          <span>Back to Chat</span>
        </button>
      ) : (
        <div className="communication-chat-menu-anchor" ref={menuAnchorRef}>
          <button
            className={`communication-chat-menu${isMenuOpen ? " communication-chat-menu--open" : ""}`}
            type="button"
            ref={menuTriggerRef}
            aria-label={
              "Conversation options"
            }
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-controls={isMenuOpen ? menuId : undefined}
            aria-disabled={undefined}
            onClick={handleMenuToggle}
          >
            <img
              className="communication-chat-menu-highlight"
              src={menuTriggerHighlight}
              alt=""
              aria-hidden="true"
            />
            <img
              className="communication-chat-menu-icon"
              src={menuIcon}
              alt=""
            />
          </button>
          {isMenuOpen && (
            <ChatOptionsMenu
              conversation={conversation}
              id={menuId}
              menuRef={menuRef}
              onAction={handleMenuAction}
              onDismiss={() => setOpenConversationId(null)}
              position={menuPosition}
            />
          )}
        </div>
      )}
    </header>
  );
}
