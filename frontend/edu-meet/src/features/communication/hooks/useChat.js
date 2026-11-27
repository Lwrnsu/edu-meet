import { useEffect, useRef, useState } from "react";
import { getMessages, getOlderMessages, sendAttachment as uploadAttachment } from "../services/communicationApi.js";
import { createChatSocket } from "../services/chatSocket.js";
import { adaptMessage, adaptMessages, mergeMessages } from "../utils/communicationAdapters.js";
import { validateMessageText } from "../utils/communicationValidation.js";

const HISTORY_PAGE_SIZE = 20;

export default function useChat({
  initialMessagesByConversationId,
  currentUserId = "current-user",
  live = false,
  conversationId,
  onConversationUnavailable,
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
  const [historyResult, setHistoryResult] = useState(null);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [paginationByConversationId, setPaginationByConversationId] =
    useState({});

  const socketRef = useRef(null);
  const olderRequests = useRef(new Set());

  useEffect(() => {
    if (!live) return;

    const socket = createChatSocket({ endpoint: "/chat", userId: currentUserId });
    socketRef.current = socket;
    const unsubscribeState = socket.onStateChange(setConnectionState);
    const unsubscribeError = socket.onError((event) => setError(event.message));
    const unsubscribeMessages = socket.onSavedMessage((payload) => {
      try {
        const message = adaptMessage(payload, currentUserId, { numericTimestampUnit: "seconds" });
        setMessagesByConversationId((current) => ({
          ...current,
          [message.conversationId]: mergeMessages(current[message.conversationId] ?? [], [message]),
        }));
        if (message.direction === "outgoing") setLastSentMessageId(message.id);
      } catch (error) {
        setError(error.message);
      }
    });
    socket.connect();

    return () => {
      unsubscribeMessages();
      unsubscribeError();
      unsubscribeState();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [live, currentUserId]);

  useEffect(() => {
    if (!live || !conversationId || connectionState !== "open") return;

    const controller = new AbortController();
    const { signal } = controller;
    getMessages(conversationId, currentUserId, { signal })
      .then((payload) => {
        if (signal.aborted) return;
        const history = adaptMessages(payload, currentUserId, { numericTimestampUnit: "seconds" });
        setMessagesByConversationId((current) => ({
          ...current,
          [conversationId]: mergeMessages(history, current[conversationId] ?? []),
        }));
        setPaginationByConversationId((current) => {
          if (current[conversationId]?.beforeId) return current;
          return {
            ...current,
            [conversationId]: {
              beforeId: payload.at(-1)?.id,
              hasMore: payload.length === HISTORY_PAGE_SIZE,
            },
          };
        });
        setHistoryResult({ conversationId });
      })
      .catch((error) => {
        if (signal.aborted) return;
        if (error.status === 403 || error.status === 404) {
          setMessagesByConversationId((current) => ({
            ...current,
            [conversationId]: [],
          }));
          onConversationUnavailable(conversationId, error.message);
        } else {
          setHistoryResult({ conversationId, error: error.message });
        }
      });

    return () => controller.abort();
  }, [live, conversationId, connectionState, currentUserId, onConversationUnavailable]);

  function sendMessage(selectedConversationId, text) {
    if (!selectedConversationId) {
      return false;
    }

    const validation = validateMessageText(text);
    if (!validation.valid) {
      return false;
    }

    if (live) {
      if (!socketRef.current || connectionState !== "open") return false;
      try {
        socketRef.current.sendMessage({ conversationId: selectedConversationId, text: validation.text });
        setError(null);
        return true;
      } catch (error) {
        setError(error.message);
        return false;
      }
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

  async function sendAttachment(conversationId, file, text) {
    const saved = await uploadAttachment(conversationId, currentUserId, file, text);
    const message = adaptMessage(saved, currentUserId, { numericTimestampUnit: "seconds" });
    setMessagesByConversationId((current) => ({
      ...current,
      [conversationId]: mergeMessages(current[conversationId] ?? [], [message]),
    }));
    setLastSentMessageId(message.id);
  }

  const older = paginationByConversationId[conversationId];

  async function loadOlderMessages() {
    if (!older?.hasMore || !older.beforeId || olderRequests.current.has(conversationId)) return;

    olderRequests.current.add(conversationId);
    setPaginationByConversationId((current) => ({
      ...current,
      [conversationId]: { ...older, isLoading: true },
    }));
    try {
      const payload = await getOlderMessages(conversationId, currentUserId, older.beforeId);
      const history = adaptMessages(payload, currentUserId, { numericTimestampUnit: "seconds" });
      setMessagesByConversationId((current) => ({
        ...current,
        [conversationId]: mergeMessages(history, current[conversationId] ?? []),
      }));
      setPaginationByConversationId((current) => ({
        ...current,
        [conversationId]: {
          beforeId: payload.at(-1)?.id ?? older.beforeId,
          hasMore: payload.length === HISTORY_PAGE_SIZE,
        },
      }));
    } catch (error) {
      setPaginationByConversationId((current) => ({
        ...current,
        [conversationId]: { ...older, isLoading: false, error: error.message },
      }));
      if (error.status === 403 || error.status === 404) {
        setMessagesByConversationId((current) => ({ ...current, [conversationId]: [] }));
        onConversationUnavailable(conversationId, error.message);
      }
    } finally {
      olderRequests.current.delete(conversationId);
    }
  }

  return {
    messagesByConversationId,
    lastSentMessageId,
    isLoading: live && Boolean(conversationId) && historyResult?.conversationId !== conversationId,
    historyError: historyResult?.conversationId === conversationId ? historyResult?.error : null,
    error,
    connectionState,
    older,
    loadOlderMessages,
    sendMessage,
    sendAttachment,
  };
}
