import { useState } from "react";
import { validateMessageText } from "../utils/communicationValidation.js";

export default function useChat({
  initialMessagesByConversationId,
  currentUserId = "current-user",
  initialPinnedMessageIdsByConversationId = {},
}) {
  if (
    typeof currentUserId !== "string" ||
    currentUserId.trim() === ""
  ) {
    throw new Error("currentUserId must be a nonblank string");
  }

  const [messagesByConversationId, setMessagesByConversationId] = useState(
    () => initialMessagesByConversationId,
  );
  const [lastSentMessageId, setLastSentMessageId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [paginationByConversationId, setPaginationByConversationId] =
    useState({});
  const [pinnedMessageIdsByConversationId, setPinnedMessageIdsByConversationId] =
    useState(() =>
      Object.fromEntries(
        Object.entries(initialPinnedMessageIdsByConversationId).map(
          ([conversationId, messageIds]) => [
            conversationId,
            [...messageIds],
          ],
        ),
      ),
    );

  function sendMessage(selectedConversationId, text) {
    if (!selectedConversationId) {
      return false;
    }

    const validation = validateMessageText(text);
    if (!validation.valid) {
      return false;
    }

    const sentAt = new Date();
    const messageId = crypto.randomUUID();
    const timestamp = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(sentAt);

    const message = {
      id: messageId,
      direction: "outgoing",
      senderId: currentUserId,
      text: validation.text,
      timestamp,
      createdAt: sentAt.toISOString(),
    };

    setMessagesByConversationId((currentMessages) => ({
      ...currentMessages,
      [selectedConversationId]: [
        ...(currentMessages[selectedConversationId] ?? []),
        message,
      ],
    }));
    setLastSentMessageId(messageId);
    return true;
  }

  function getPaginationState(conversationId) {
    return (
      paginationByConversationId[conversationId] ?? {
        beforeId: null,
        hasMore: null,
        isLoadingOlder: false,
      }
    );
  }

  function setPaginationCursor(conversationId, beforeId, hasMore = null) {
    setPaginationByConversationId((current) => ({
      ...current,
      [conversationId]: {
        ...current[conversationId],
        beforeId,
        hasMore,
      },
    }));
  }

  function setOlderMessagesLoading(conversationId, isLoadingOlder) {
    setPaginationByConversationId((current) => ({
      ...current,
      [conversationId]: {
        beforeId: null,
        hasMore: null,
        ...current[conversationId],
        isLoadingOlder,
      },
    }));
  }

  function getPinnedMessageIds(conversationId) {
    return pinnedMessageIdsByConversationId[conversationId] ?? [];
  }

  function togglePinnedMessage(conversationId, messageId) {
    if (!conversationId || !messageId) {
      return false;
    }

    setPinnedMessageIdsByConversationId((current) => {
      const currentIds = current[conversationId] ?? [];
      if (currentIds.includes(messageId)) {
        return {
          ...current,
          [conversationId]: currentIds.filter((id) => id !== messageId),
        };
      }

      return {
        ...current,
        [conversationId]: [...currentIds, messageId],
      };
    });
    return true;
  }

  function unpinMessage(conversationId, messageId) {
    setPinnedMessageIdsByConversationId((current) => ({
      ...current,
      [conversationId]: (current[conversationId] ?? []).filter(
        (id) => id !== messageId,
      ),
    }));
  }

  return {
    messagesByConversationId,
    lastSentMessageId,
    isLoading,
    error,
    connectionState,
    paginationByConversationId,
    pinnedMessageIdsByConversationId,
    setIsLoading,
    setError,
    setConnectionState,
    getPaginationState,
    setPaginationCursor,
    setOlderMessagesLoading,
    getPinnedMessageIds,
    togglePinnedMessage,
    unpinMessage,
    sendMessage,
  };
}
