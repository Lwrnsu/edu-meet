import { useCallback, useEffect, useState } from "react";
import { getConversations, renameGroup } from "../services/communicationApi.js";
import { adaptConversations } from "../utils/communicationAdapters.js";

export default function useConversations({
  initialConversations,
  currentUserId,
  membersByConversationId,
}) {
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialConversations[0]?.id,
  );
  const [activeChatPanelView, setActiveChatPanelView] = useState("chat");
  const [loadedConversations, setLoadedConversations] = useState(initialConversations);
  const [refreshCount, setRefreshCount] = useState(0);
  const [accessError, setAccessError] = useState(null);
  const [leaveGroupConversationId, setLeaveGroupConversationId] =
    useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(currentUserId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUserId) return;

    const controller = new AbortController();
    const { signal } = controller;
    getConversations(currentUserId, { signal })
      .then((payload) => {
        if (signal.aborted) return;
        const next = adaptConversations(payload, { numericTimestampUnit: "seconds" });
        setLoadedConversations(next);
        if (refreshCount === 0) setSelectedConversationId(next[0]?.id ?? null);
      })
      .catch((error) => {
        if (!signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [currentUserId, refreshCount]);

  const handleConversationUnavailable = useCallback((id, message) => {
    setAccessError(message);
    setSelectedConversationId((current) => current === id ? null : current);
    setLoadedConversations((current) => current.filter((conversation) => conversation.id !== id));
    setIsLoading(true);
    setError(null);
    setRefreshCount((count) => count + 1);
  }, []);

  const conversations = loadedConversations
    .map((conversation) => {
      if (!currentUserId || conversation.type !== "individual") return conversation;
      const peer = membersByConversationId[conversation.id]?.find((member) => member.id !== currentUserId);
      return {
        ...conversation,
        name: peer?.name ?? conversation.name,
        avatarUrl: peer?.avatarUrl ?? conversation.avatarUrl,
      };
    });

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const isEmpty = conversations.length === 0;

  async function renameConversation(conversationId, name) {
    const updated = await renameGroup(conversationId, currentUserId, name);
    setLoadedConversations((current) => current.map((conversation) =>
      conversation.id === updated.id ? { ...conversation, name: updated.name } : conversation,
    ));
  }

  function handleMenuAction(action, conversation) {
    if (
      (action === "view-members" || action === "pinned-messages") &&
      conversation?.type === "group" &&
      conversation.id === selectedConversationId
    ) {
      setActiveChatPanelView(
        action === "view-members" ? "members" : "pinned",
      );
      return;
    }

    if (action === "leave-group" && conversation?.type === "group") {
      setLeaveGroupConversationId(conversation.id);
    }
  }

  function handleSelectConversation(conversationId) {
    setAccessError(null);
    setSelectedConversationId(conversationId);
    setActiveChatPanelView("chat");
  }

  function handleCancelLeaveGroup() {
    setLeaveGroupConversationId(null);
  }

  function handleConfirmLeaveGroup() {
    if (leaveGroupConversationId === null) {
      return;
    }

    const conversationId = leaveGroupConversationId;
    setLoadedConversations((current) =>
      current.filter((conversation) => conversation.id !== conversationId),
    );
    setSelectedConversationId((currentId) =>
      currentId === conversationId ? null : currentId,
    );
    setLeaveGroupConversationId(null);
  }

  return {
    selectedConversationId,
    activeChatPanelView,
    leaveGroupConversationId,
    conversations,
    selectedConversation,
    isLoading,
    isEmpty,
    error: error ?? accessError,
    handleConversationUnavailable,
    setIsLoading,
    setError,
    setActiveChatPanelView,
    handleMenuAction,
    renameConversation,
    handleSelectConversation,
    handleCancelLeaveGroup,
    handleConfirmLeaveGroup,
  };
}
