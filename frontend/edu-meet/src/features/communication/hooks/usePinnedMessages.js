import { useEffect, useRef, useState } from "react";
import { adaptMessage } from "../utils/communicationAdapters.js";

export default function usePinnedMessages(conversationId, userId, showingPins, api, { pinChanges, connected }) {
  const [byConversation, setByConversation] = useState({});
  const [pending, setPending] = useState({});
  const writes = useRef(new Set());
  const activeRead = useRef(null);
  const { messageId: pendingMessageId, revision } = pending[conversationId] ?? {};

  useEffect(() => {
    if (!conversationId || !userId || pendingMessageId || writes.current.has(conversationId)) return;
    const controller = new AbortController();
    const { signal } = controller;
    activeRead.current = { conversationId, controller };
    api.getPinnedMessages(conversationId, { signal })
      .then((payload) => {
        if (signal.aborted || writes.current.has(conversationId)) return;
        const messages = payload.map((message) =>
          adaptMessage(message, userId, { numericTimestampUnit: "seconds" }),
        );
        setByConversation((current) => ({
          ...current,
          [conversationId]: { messages, mutationError: current[conversationId]?.mutationError },
        }));
      })
      .catch((error) => {
        if (signal.aborted || writes.current.has(conversationId)) return;
        setByConversation((current) => ({
          ...current,
          [conversationId]: { error: error.message, mutationError: current[conversationId]?.mutationError },
        }));
      });
    return () => controller.abort();
  }, [api, conversationId, userId, showingPins, pinChanges, connected, pendingMessageId, revision]);

  async function updatePin(messageId, pinned) {
    if (!conversationId || writes.current.has(conversationId)) return;
    writes.current.add(conversationId);
    if (activeRead.current?.conversationId === conversationId) {
      activeRead.current.controller.abort();
    }
    setPending((current) => ({
      ...current, [conversationId]: { ...current[conversationId], messageId },
    }));
    setByConversation((current) => ({
      ...current,
      [conversationId]: { ...current[conversationId], mutationError: undefined },
    }));
    try {
      // REST and socket updates both refresh the persisted list, so concurrent writes
      // cannot reapply stale pin state from a mutation response.
      await api.setMessagePinned(conversationId, messageId, pinned);
    } catch (error) {
      setByConversation((current) => ({
        ...current,
        [conversationId]: { ...current[conversationId], mutationError: error.message },
      }));
    } finally {
      writes.current.delete(conversationId);
      setPending((current) => ({
        ...current, [conversationId]: { revision: (current[conversationId]?.revision ?? 0) + 1 },
      }));
    }
  }

  return {
    messages: byConversation[conversationId]?.messages,
    error: byConversation[conversationId]?.mutationError ?? byConversation[conversationId]?.error,
    pendingMessageId,
    updatePin,
  };
}
