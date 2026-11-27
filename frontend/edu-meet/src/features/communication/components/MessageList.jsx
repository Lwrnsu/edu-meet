import { useLayoutEffect, useRef } from "react";
import groupMessages from "../data/groupMessages.js";
import MessageGroup from "./MessageGroup.jsx";

export default function MessageList({
  conversation,
  messages = [],
  lastSentMessageId,
  pinnedMessageIds = [],
  openMessageMenuId,
  onOpenMessageMenu,
  onCloseMessageMenu,
  onTogglePin,
}) {
  const scrollContainerRef = useRef(null);
  const hasOpenedRef = useRef(false);
  const previousConversationId = useRef(conversation?.id);
  const previousSentMessageId = useRef(lastSentMessageId);
  const previousLastMessageId = useRef(messages[messages.length - 1]?.id);
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

    if (conversationChanged) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "instant",
      });
      isNearBottomRef.current = true;
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
              pinnedMessageIds={pinnedMessageIds}
              openMessageMenuId={openMessageMenuId}
              onOpenMessageMenu={onOpenMessageMenu}
              onCloseMessageMenu={onCloseMessageMenu}
              onTogglePin={onTogglePin}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
