import { useState } from "react";
import { validateMessageText } from "../utils/communicationValidation.js";

export default function useChat({
  initialMessagesByConversationId,
  currentUserId = "current-user",
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

  return {
    messagesByConversationId,
    lastSentMessageId,
    isLoading,
    error,
    connectionState,
    paginationByConversationId,
    setIsLoading,
    setError,
    setConnectionState,
    getPaginationState,
    setPaginationCursor,
    setOlderMessagesLoading,
    sendMessage,
  };
}
