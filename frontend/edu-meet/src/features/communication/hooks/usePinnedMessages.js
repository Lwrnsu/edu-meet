import { useEffect, useRef, useState } from "react";
import { getPinnedMessages, setMessagePinned } from "../services/communicationApi.js";
import { adaptMessage } from "../utils/communicationAdapters.js";

export default function usePinnedMessages(conversationId, userId, showingPins) {
  const [byConversation, setByConversation] = useState({});
  const [pending, setPending] = useState({});
  const writes = useRef(new Set());
  const activeRead = useRef(null);

  useEffect(() => {
    if (!conversationId || !userId || writes.current.has(conversationId)) return;
    const controller = new AbortController();
    const { signal } = controller;
    activeRead.current = { conversationId, controller };
    getPinnedMessages(conversationId, userId, { signal })
      .then((payload) => {
        if (signal.aborted || writes.current.has(conversationId)) return;
        const messages = payload.map((message) =>
          adaptMessage(message, userId, { numericTimestampUnit: "seconds" }),
        );
        setByConversation((current) => ({ ...current, [conversationId]: { messages } }));
      })
      .catch((error) => {
        if (signal.aborted || writes.current.has(conversationId)) return;
        setByConversation((current) => ({
          ...current,
          [conversationId]: { ...current[conversationId], error: error.message },
        }));
      });
    return () => controller.abort();
  }, [conversationId, userId, showingPins]);

  async function updatePin(messageId, pinned) {
    if (!conversationId || writes.current.has(conversationId)) return;
    writes.current.add(conversationId);
    if (activeRead.current?.conversationId === conversationId) {
      activeRead.current.controller.abort();
    }
    setPending((current) => ({ ...current, [conversationId]: messageId }));
    try {
      const response = await setMessagePinned(conversationId, userId, messageId, pinned);
      const updated = pinned ? adaptMessage(response, userId, { numericTimestampUnit: "seconds" }) : null;
      setByConversation((current) => {
        const messages = current[conversationId]?.messages ?? [];
        return {
          ...current,
          [conversationId]: {
            messages: pinned
              ? messages.some((message) => message.id === messageId) ? messages : [...messages, updated]
              : messages.filter((message) => message.id !== messageId),
          },
        };
      });
    } catch (error) {
      setByConversation((current) => ({
        ...current,
        [conversationId]: { ...current[conversationId], error: error.message },
      }));
    } finally {
      writes.current.delete(conversationId);
      setPending((current) => ({ ...current, [conversationId]: undefined }));
    }
  }

  return {
    messages: byConversation[conversationId]?.messages,
    error: byConversation[conversationId]?.error,
    pendingMessageId: pending[conversationId],
    updatePin,
  };
}
