import { useCallback, useEffect, useState } from "react";
import { adaptConversation, adaptConversations } from "../utils/communicationAdapters.js";
import { isNewerPreview } from "../utils/conversationPreview.js";

export default function useConversations({
  initialConversations,
  currentUserId,
  api,
  membersByConversationId,
}) {
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialConversations[0]?.id,
  );
  const [activeChatPanelView, setActiveChatPanelView] = useState("chat");
  const [showArchived, setShowArchived] = useState(false);
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
    api.getConversations({ signal })
      .then((payload) => {
        if (signal.aborted) return;
        const next = adaptConversations(payload, { numericTimestampUnit: "seconds" });
        setLoadedConversations((current) => {
          const previousById = new Map(current.map((conversation) => [conversation.id, conversation]));
          return next.map((conversation) => {
            const previous = previousById.get(conversation.id);
            if (!previous || !isNewerPreview(previous.lastMessageTime, previous.lastMessageId, conversation)) {
              return conversation;
            }
            return {
              ...conversation,
              preview: previous.preview,
              lastMessageTime: previous.lastMessageTime,
              lastMessageText: previous.lastMessageText,
              lastMessageId: previous.lastMessageId,
              lastMessageSenderId: previous.lastMessageSenderId,
              lastMessageSenderName: previous.lastMessageSenderName,
              lastMessageAttachmentContentType: previous.lastMessageAttachmentContentType,
            };
          });
        });
        setSelectedConversationId((current) => current === undefined
          ? next.find((conversation) => !conversation.archived)?.id ?? null
          : current);
      })
      .catch((error) => {
        if (!signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [api, currentUserId, refreshCount]);

  const handleConversationUnavailable = useCallback((id, message) => {
    setAccessError(message);
    setSelectedConversationId((current) => current === id ? null : current);
    setLoadedConversations((current) => current.filter((conversation) => conversation.id !== id));
    setIsLoading(true);
    setError(null);
    setRefreshCount((count) => count + 1);
  }, []);

  const refreshAfterUnsend = useCallback((id, messageId) => {
    setLoadedConversations((current) => current.map((conversation) =>
      conversation.id === id && conversation.lastMessageId === messageId ? {
        ...conversation,
        preview: "No messages yet.",
        lastMessageId: null,
        lastMessageTime: null,
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageSenderName: null,
        lastMessageAttachmentContentType: null,
      } : conversation,
    ));
    setRefreshCount((count) => count + 1);
  }, []);

  const conversations = loadedConversations
    .map((conversation) => {
      if (!currentUserId || conversation.type !== "individual") return conversation;
      const peer = membersByConversationId[conversation.id]?.find((member) => member.id !== currentUserId);
      return {
        ...conversation,
        name: peer?.name
          ?? (conversation.lastMessageSenderId !== currentUserId ? conversation.lastMessageSenderName : null)
          ?? conversation.name,
        avatarUrl: peer?.avatarUrl ?? conversation.avatarUrl,
      };
    });

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const isEmpty = conversations.length === 0;

  async function renameConversation(conversationId, name) {
    const updated = currentUserId
      ? await api.renameGroup(conversationId, name)
      : { id: conversationId, name };
    setLoadedConversations((current) => current.map((conversation) =>
      conversation.id === updated.id ? { ...conversation, name: updated.name } : conversation,
    ));
  }

  function handleMenuAction(action, conversation) {
    const isGroup = conversation?.type === "group";
    if (
      conversation?.id === selectedConversationId &&
      ((action === "view-members" && isGroup) ||
        action === "pinned-messages")
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
    setShowArchived(loadedConversations.find(({ id }) => id === conversationId)?.archived === true);
  }

  function toggleArchivedView() {
    setShowArchived(!showArchived);
    setSelectedConversationId(null);
    setActiveChatPanelView("chat");
  }

  async function setConversationArchived(conversation) {
    setError(null);
    try {
      const { archived } = await api.setConversationArchived(conversation.id, !conversation.archived);
      setLoadedConversations((current) => current.map((entry) =>
        entry.id === conversation.id ? { ...entry, archived } : entry,
      ));
      setSelectedConversationId((current) => current === conversation.id ? null : current);
      setRefreshCount((count) => count + 1);
    } catch (error) {
      setError(error.message);
    }
  }

  async function getOrCreateDirectConversation(member, { signal }) {
    const existing = loadedConversations.find((conversation) =>
      conversation.type === "individual" && conversation.participantIds.includes(member.id),
    );
    if (existing) return existing.id;

    const payload = await api.createDirectConversation(currentUserId, member.id, { signal });
    if (signal.aborted) return;
    const direct = adaptConversation(payload, { numericTimestampUnit: "seconds" });
    setLoadedConversations((current) => current.some(({ id }) => id === direct.id)
      ? current
      : [...current, { ...direct, name: member.name, avatarUrl: member.avatarUrl ?? direct.avatarUrl }],
    );
    setRefreshCount((count) => count + 1);
    return direct.id;
  }

  function refreshForIncomingMessage(conversationId) {
    if (loadedConversations.some(({ id }) => id === conversationId)) return;
    setRefreshCount((count) => count + 1);
  }

  function handleCancelLeaveGroup() {
    setLeaveGroupConversationId(null);
  }

  async function handleConfirmLeaveGroup() {
    const conversationId = leaveGroupConversationId;
    if (conversationId === null) return;

    if (currentUserId) {
      try {
        await api.leaveGroup(conversationId);
      } catch (error) {
        // The chat may already be unavailable if a previous leave succeeded.
        if (error.status !== 404) throw error;
      }
    }

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
    showArchived,
    leaveGroupConversationId,
    conversations,
    selectedConversation,
    isLoading,
    isEmpty,
    error: error ?? accessError,
    handleConversationUnavailable,
    refreshAfterUnsend,
    setIsLoading,
    setError,
    setActiveChatPanelView,
    handleMenuAction,
    renameConversation,
    handleSelectConversation,
    toggleArchivedView,
    setConversationArchived,
    getOrCreateDirectConversation,
    refreshForIncomingMessage,
    handleCancelLeaveGroup,
    handleConfirmLeaveGroup,
  };
}
