import { useLayoutEffect, useRef, useState } from "react";
import ChatHeader from "./components/ChatHeader.jsx";
import ChatMembersView from "./components/ChatMembersView.jsx";
import PinnedMessagesView from "./components/PinnedMessagesView.jsx";
import LeaveGroupDialog from "./components/LeaveGroupDialog.jsx";
import MessageInput from "./components/MessageInput.jsx";
import MessageList from "./components/MessageList.jsx";
import ConversationPanel from "./components/ConversationPanel.jsx";
import mockConversations from "./data/mockConversations.js";
import mockMembers from "./data/mockMembers.js";
import mockMessagesByConversationId from "./data/mockMessages.js";
import mockPinnedMessageIdsByConversationId from "./data/mockPinnedMessages.js";
import "./styles/communication.css";

export default function CommunicationModule() {
  const [selectedConversationId, setSelectedConversationId] = useState(
    mockConversations[0]?.id,
  );
  const [activeChatPanelView, setActiveChatPanelView] = useState("chat");
  const [visibleConversationIds, setVisibleConversationIds] = useState(
    () => new Set(mockConversations.map((conversation) => conversation.id)),
  );
  const [leaveGroupConversationId, setLeaveGroupConversationId] =
    useState(null);
  const [messagesByConversationId, setMessagesByConversationId] = useState(
    () =>
      Object.fromEntries(
        Object.entries(mockMessagesByConversationId).map(
          ([conversationId, messages]) => [
            conversationId,
            messages.map((message) => ({ ...message })),
          ],
        ),
      ),
  );
  const [lastSentMessageId, setLastSentMessageId] = useState(null);
  const menuTriggerRef = useRef(null);
  const conversationSearchRef = useRef(null);
  const dialogCloseIntentRef = useRef(null);
  const conversations = mockConversations
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
  const selectedMessages = messagesByConversationId[selectedConversationId] ?? [];
  const selectedMembers =
    selectedConversation?.type === "group"
      ? mockMembers.filter(
          (member) => member.conversationId === selectedConversation.id,
        )
      : [];
  const selectedPinnedMessageIds =
    selectedConversation?.type === "group"
      ? mockPinnedMessageIdsByConversationId[selectedConversation.id] ?? []
      : [];
  const selectedPinnedMessages = selectedPinnedMessageIds.flatMap(
    (messageId) => {
      const pinnedMessage = selectedMessages.find(
        (message) => message.id === messageId,
      );
      return pinnedMessage ? [pinnedMessage] : [];
    },
  );
  const showingMembers =
    activeChatPanelView === "members" &&
    selectedConversation?.type === "group";
  const showingPinnedMessages =
    activeChatPanelView === "pinned" &&
    selectedConversation?.type === "group";

  useLayoutEffect(() => {
    if (
      leaveGroupConversationId !== null ||
      dialogCloseIntentRef.current === null
    ) {
      return;
    }

    if (dialogCloseIntentRef.current === "cancel") {
      menuTriggerRef.current?.focus();
    } else {
      conversationSearchRef.current?.focus();
    }

    dialogCloseIntentRef.current = null;
  }, [leaveGroupConversationId]);

  function handleSendMessage(text) {
    if (!selectedConversationId) {
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
      senderId: "current-user",
      text,
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
    dialogCloseIntentRef.current = "cancel";
    setLeaveGroupConversationId(null);
  }

  function handleConfirmLeaveGroup() {
    if (leaveGroupConversationId === null) {
      return;
    }

    const conversationId = leaveGroupConversationId;
    dialogCloseIntentRef.current = "leave";
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

  return (
    <>
      <main
        className="communication-module"
        inert={leaveGroupConversationId !== null}
      >
        <section className="communication-conversations">
          <ConversationPanel
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            searchInputRef={conversationSearchRef}
          />
        </section>

        <section className="communication-chat" aria-label="Conversation">
          <div className="communication-chat-panel">
            {selectedConversation ? (
              <>
                <ChatHeader
                  key={selectedConversationId}
                  conversation={selectedConversation}
                  onMenuAction={handleMenuAction}
                  view={
                    showingMembers
                      ? "members"
                      : showingPinnedMessages
                        ? "pinned"
                        : "chat"
                  }
                  onBackToChat={() => setActiveChatPanelView("chat")}
                  triggerRef={menuTriggerRef}
                />
                {showingMembers ? (
                  <ChatMembersView
                    conversation={selectedConversation}
                    members={selectedMembers}
                  />
                ) : showingPinnedMessages ? (
                  <PinnedMessagesView
                    conversation={selectedConversation}
                    messages={selectedPinnedMessages}
                  />
                ) : (
                  <>
                    <div className="communication-chat-content">
                      <MessageList
                        conversation={selectedConversation}
                        messages={selectedMessages}
                        lastSentMessageId={lastSentMessageId}
                      />
                    </div>
                    <MessageInput onSendMessage={handleSendMessage} />
                  </>
                )}
              </>
            ) : (
              <p
                className="communication-no-conversation-selected"
                role="status"
              >
                {conversations.length > 0
                  ? "No conversation selected."
                  : "No conversations available."}
              </p>
            )}
          </div>
        </section>
      </main>
      {leaveGroupConversationId !== null && (
        <LeaveGroupDialog
          onCancel={handleCancelLeaveGroup}
          onConfirm={handleConfirmLeaveGroup}
        />
      )}
    </>
  );
}
