import { useLayoutEffect, useRef, useState } from "react";
import ChatHeader from "./components/ChatHeader.jsx";
import ChatMembersView from "./components/ChatMembersView.jsx";
import PinnedMessagesView from "./components/PinnedMessagesView.jsx";
import LeaveGroupDialog from "./components/LeaveGroupDialog.jsx";
import MessageInput from "./components/MessageInput.jsx";
import MessageList from "./components/MessageList.jsx";
import ConversationPanel from "./components/ConversationPanel.jsx";
import mockCommunicationProvider from "./data/mockCommunicationProvider.js";
import useConversations from "./hooks/useConversations.js";
import useChat from "./hooks/useChat.js";
import "./styles/communication.css";

export default function CommunicationModule() {
  const [initialMockData] = useState(() =>
    mockCommunicationProvider.getInitialState(),
  );
  const mockConversations = initialMockData.conversations;
  const mockMembers = initialMockData.members;
  const mockPinnedMessageIdsByConversationId =
    initialMockData.pinnedMessageIdsByConversationId;
  const initialMessagesByConversationId =
    initialMockData.messagesByConversationId;
  const chatState = useChat({
    initialMessagesByConversationId,
    currentUserId: "current-user",
  });
  const conversationState = useConversations({
    initialConversations: mockConversations,
    messagesByConversationId: chatState.messagesByConversationId,
  });
  const selectedConversationId =
    conversationState.selectedConversationId;
  const activeChatPanelView =
    conversationState.activeChatPanelView;
  const leaveGroupConversationId =
    conversationState.leaveGroupConversationId;
  const conversations = conversationState.conversations;
  const selectedConversation = conversationState.selectedConversation;
  const selectedMessages =
    chatState.messagesByConversationId[selectedConversationId] ?? [];
  const lastSentMessageId = chatState.lastSentMessageId;
  const menuTriggerRef = useRef(null);
  const conversationSearchRef = useRef(null);
  const dialogCloseIntentRef = useRef(null);
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
    return chatState.sendMessage(selectedConversationId, text);
  }

  function handleMenuAction(action, conversation) {
    conversationState.handleMenuAction(action, conversation);
  }

  function handleSelectConversation(conversationId) {
    conversationState.handleSelectConversation(conversationId);
  }

  function handleCancelLeaveGroup() {
    dialogCloseIntentRef.current = "cancel";
    conversationState.handleCancelLeaveGroup();
  }

  function handleConfirmLeaveGroup() {
    dialogCloseIntentRef.current = "leave";
    conversationState.handleConfirmLeaveGroup();
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
                  onBackToChat={() =>
                    conversationState.setActiveChatPanelView("chat")
                  }
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
