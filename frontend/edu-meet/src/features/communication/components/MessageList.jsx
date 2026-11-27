import { useLayoutEffect, useRef } from "react";
import groupMessages from "../data/groupMessages.js";
import MessageGroup from "./MessageGroup.jsx";

export default function MessageList({
  conversation,
  messages = [],
  lastSentMessageId,
  older,
  onLoadOlder,
  pinnedIds,
  isUpdatingPin,
  onTogglePin,
}) {
  const scrollContainerRef = useRef(null);
  const hasOpenedRef = useRef(false);
  const previousConversationId = useRef(conversation?.id);
  const previousSentMessageId = useRef(lastSentMessageId);
  const previousLastMessageId = useRef(messages[messages.length - 1]?.id);
  const previousHeight = useRef(0);
  const previousFirstMessageId = useRef(null);
  const isNearBottomRef = useRef(true);
  const messageGroups = groupMessages(messages);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const conversationChanged =
      !hasOpenedRef.current ||
      previousConversationId.current !== conversation?.id;
    const sentNewMessage =
      lastSentMessageId &&
      lastSentMessageId !== previousSentMessageId.current &&
      messages.some((message) => message.id === lastSentMessageId);
    const latestMessageId = messages[messages.length - 1]?.id;
    const messageAppended =
      latestMessageId &&
      latestMessageId !== previousLastMessageId.current;

    const oldestMessageId = messages[0]?.id;
    const addedOlderMessages = previousFirstMessageId.current &&
      oldestMessageId !== previousFirstMessageId.current &&
      messages.some((message) => message.id === previousFirstMessageId.current);

    if (conversationChanged) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "instant",
      });
      isNearBottomRef.current = true;
    } else if (addedOlderMessages && !sentNewMessage) {
      scrollContainer.scrollTop += scrollContainer.scrollHeight - previousHeight.current;
    } else if (sentNewMessage || (messageAppended && isNearBottomRef.current)) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
      isNearBottomRef.current = true;
    }

    hasOpenedRef.current = true;
    previousConversationId.current = conversation?.id;
    previousSentMessageId.current = lastSentMessageId;
    previousLastMessageId.current = latestMessageId;
    previousFirstMessageId.current = oldestMessageId;
    previousHeight.current = scrollContainer.scrollHeight;
  }, [conversation?.id, lastSentMessageId, messages]);

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
        const element = event.currentTarget;
        isNearBottomRef.current =
          element.scrollHeight - element.scrollTop - element.clientHeight <= 80;
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
        <ol className="communication-message-list">
          {messageGroups.map((group) => (
            <MessageGroup
              key={group.id}
              group={group}
              pinnedIds={pinnedIds}
              isUpdatingPin={isUpdatingPin}
              onTogglePin={onTogglePin}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
