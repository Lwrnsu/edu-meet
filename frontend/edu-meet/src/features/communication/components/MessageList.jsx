import { useLayoutEffect, useRef, useState } from "react";
import groupMessages from "../data/groupMessages.js";
import MessageGroup from "./MessageGroup.jsx";

const NEAR_BOTTOM_DISTANCE = 80;

function readViewport(container) {
  const { top, bottom } = container.getBoundingClientRect();
  const firstVisible = Array.from(container.querySelectorAll("[data-message-id]"))
    .find((row) => {
      const bounds = row.getBoundingClientRect();
      return bounds.bottom > top && bounds.top < bottom;
    });
  return {
    scrollTop: container.scrollTop,
    bottomDistance: container.scrollHeight - container.scrollTop - container.clientHeight,
    messageId: firstVisible?.dataset.messageId,
    offset: firstVisible ? firstVisible.getBoundingClientRect().top - top : 0,
  };
}

function restoreAnchor(container, viewport) {
  if (!viewport?.messageId) return;

  const row = container.querySelector(`[data-message-id="${CSS.escape(viewport.messageId)}"]`);
  if (!row) return;

  const offset = row.getBoundingClientRect().top - container.getBoundingClientRect().top;
  const delta = offset - viewport.offset;
  if (Math.abs(delta) > 0.5) container.scrollTop += delta;
}

function scrollToLatest(container) {
  const bottom = Math.max(0, container.scrollHeight - container.clientHeight);
  if (Math.abs(container.scrollTop - bottom) > 0.5) container.scrollTop = bottom;
}

export default function MessageList({
  conversation,
  messages = [],
  historyReady,
  lastSentMessageId,
  older,
  onLoadOlder,
  pinnedIds,
  isUpdatingPin,
  onTogglePin,
}) {
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const scrollContainerRef = useRef(null);
  const messageContentRef = useRef(null);
  const previousMessagesRef = useRef(null);
  const viewportRef = useRef(null);
  const messageGroups = groupMessages(messages);
  const hasMessages = messageGroups.length > 0;

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const previous = previousMessagesRef.current;
    if (!container || (!previous && !historyReady)) return;

    const orderedMessages = messageGroups.flatMap((group) => group.messages);
    const ids = new Set(orderedMessages.map((message) => message.id));
    const firstId = orderedMessages[0]?.id;
    const latest = orderedMessages.at(-1);
    const messagesChanged = previous &&
      (ids.size !== previous.ids.size || orderedMessages.some((message) => !previous.ids.has(message.id)));
    const sentNewMessage = previous && lastSentMessageId &&
      lastSentMessageId !== previous.sentId &&
      ids.has(lastSentMessageId) && !previous.ids.has(lastSentMessageId);
    const prepended = previous?.firstId &&
      firstId !== previous.firstId && ids.has(previous.firstId);
    const incomingAppended = previous && latest?.direction === "incoming" &&
      !previous.ids.has(latest.id) &&
      (!previous.lastId || ids.has(previous.lastId));
    const viewport = viewportRef.current;

    if (!previous || sentNewMessage ||
      (!prepended && incomingAppended && viewport?.bottomDistance <= NEAR_BOTTOM_DISTANCE)) {
      scrollToLatest(container);
      viewportRef.current = readViewport(container);
    } else if (messagesChanged) {
      restoreAnchor(container, viewport);
      viewportRef.current = readViewport(container);
    }

    previousMessagesRef.current = { ids, firstId, lastId: latest?.id, sentId: lastSentMessageId };
  }, [historyReady, lastSentMessageId, messageGroups]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = messageContentRef.current;
    if (!container || !content || typeof ResizeObserver === "undefined") return;

    let height = content.getBoundingClientRect().height;
    const observer = new ResizeObserver(() => {
      const nextHeight = content.getBoundingClientRect().height;
      if (nextHeight === height) return;
      height = nextHeight;

      const viewport = viewportRef.current;
      if (!previousMessagesRef.current || !viewport) return;

      // A user scroll may have moved the viewport before its scroll event arrived.
      if (Math.abs(container.scrollTop - viewport.scrollTop) <= 0.5) {
        if (viewport.bottomDistance <= 1) {
          scrollToLatest(container);
        } else {
          restoreAnchor(container, viewport);
        }
      }
      viewportRef.current = readViewport(container);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [hasMessages]);

  if (!conversation) {
    return null;
  }

  return (
    <div
      className="communication-message-scroll"
      ref={scrollContainerRef}
      role="region"
      aria-label={`${conversation.name} messages`}
      tabIndex={0}
      onScroll={(event) => {
        viewportRef.current = readViewport(event.currentTarget);
      }}
    >
      {older?.hasMore && (
        <div className="communication-older-messages">
          <button className="communication-action-button" type="button" onClick={onLoadOlder} disabled={older.isLoading}>
            {older.isLoading ? "Loading older messages…" : "Load older messages"}
          </button>
          {older.error && <p role="alert">{older.error}</p>}
        </div>
      )}
      {messageGroups.length === 0 ? (
        <p className="communication-message-empty" role="status">
          No messages yet.
        </p>
      ) : (
        <ol className="communication-message-list" ref={messageContentRef}>
          {messageGroups.map((group) => (
            <MessageGroup
              key={group.id}
              group={group}
              pinnedIds={pinnedIds}
              isUpdatingPin={isUpdatingPin}
              onTogglePin={onTogglePin}
              openMessageMenuId={openMessageMenuId}
              setOpenMessageMenuId={setOpenMessageMenuId}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
