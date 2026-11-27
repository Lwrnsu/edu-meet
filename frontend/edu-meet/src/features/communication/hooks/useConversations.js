import { useState } from "react";

export default function useConversations({
  initialConversations,
  messagesByConversationId,
}) {
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialConversations[0]?.id,
  );
  const [activeChatPanelView, setActiveChatPanelView] = useState("chat");
  const [visibleConversationIds, setVisibleConversationIds] = useState(
    () => new Set(initialConversations.map((conversation) => conversation.id)),
  );
  const [leaveGroupConversationId, setLeaveGroupConversationId] =
    useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const conversations = initialConversations
    .filter((conversation) => visibleConversationIds.has(conversation.id))
    .map((conversation) => {
      const conversationMessages =
        messagesByConversationId[conversation.id] ?? [];
      const latestMessage =
        conversationMessages[conversationMessages.length - 1];

      const sender =
        latestMessage?.direction === "outgoing"
          ? "You"
          : latestMessage?.senderName ?? conversation.name;

      return {
        ...conversation,
        preview: latestMessage
          ? `${sender}: ${latestMessage.text}`
          : "No messages yet.",
      };
    });

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const isEmpty = conversations.length === 0;

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
    setVisibleConversationIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(conversationId);
      return nextIds;
    });
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
    error,
    setIsLoading,
    setError,
    setActiveChatPanelView,
    handleMenuAction,
    handleSelectConversation,
    handleCancelLeaveGroup,
    handleConfirmLeaveGroup,
  };
}
