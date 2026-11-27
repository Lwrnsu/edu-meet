import { useLayoutEffect, useRef, useState } from "react";
import ChatHeader from "./components/ChatHeader.jsx";
import ChatMembersView from "./components/ChatMembersView.jsx";
import PinnedMessagesView from "./components/PinnedMessagesView.jsx";
import LeaveGroupDialog from "./components/LeaveGroupDialog.jsx";
import MessageInput from "./components/MessageInput.jsx";
import MessageList from "./components/MessageList.jsx";
import ConversationPanel from "./components/ConversationPanel.jsx";
import ChangeGroupNameDialog from "./components/ChangeGroupNameDialog.jsx";
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
  const initialMessagesByConversationId =
    initialMockData.messagesByConversationId;
  const chatState = useChat({
    initialMessagesByConversationId,
    currentUserId: "current-user",
    initialPinnedMessageIdsByConversationId:
      initialMockData.pinnedMessageIdsByConversationId,
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
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [changingGroupNameConversationId, setChangingGroupNameConversationId] =
    useState(null);
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
    selectedConversation
      ? chatState.getPinnedMessageIds(selectedConversation.id)
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
    selectedConversation !== undefined;
  const changingGroupNameConversation = conversations.find(
    (conversation) =>
      conversation.id === changingGroupNameConversationId,
  );

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
    setOpenMessageMenuId(null);
    if (action === "change-name" && conversation?.type === "group") {
      setChangingGroupNameConversationId(conversation.id);
      return;
    }
    conversationState.handleMenuAction(action, conversation);
  }

  function handleSelectConversation(conversationId) {
    setOpenMessageMenuId(null);
    conversationState.handleSelectConversation(conversationId);
  }

  function handleTogglePinnedMessage(messageId) {
    if (!selectedConversationId || !messageId) {
      return;
    }
    chatState.togglePinnedMessage(selectedConversationId, messageId);
  }

  function handleNavigatePinnedMessage(messageId) {
    conversationState.setActiveChatPanelView("chat");
    setOpenMessageMenuId(null);
    window.requestAnimationFrame(() => {
      const messageRows = Array.from(
        document.querySelectorAll("[data-message-id]"),
      );
      const messageRow = messageRows.find(
        (row) => row.dataset.messageId === messageId,
      );
      if (messageRow) {
        messageRow.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }
    });
  }

  function handleCancelLeaveGroup() {
    dialogCloseIntentRef.current = "cancel";
    setOpenMessageMenuId(null);
    conversationState.handleCancelLeaveGroup();
  }

  function handleConfirmLeaveGroup() {
    dialogCloseIntentRef.current = "leave";
    setOpenMessageMenuId(null);
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
                    {
                      setOpenMessageMenuId(null);
                      conversationState.setActiveChatPanelView("chat");
                    }
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
                    onNavigateMessage={handleNavigatePinnedMessage}
                    onUnpinMessage={(messageId) =>
                      chatState.unpinMessage(selectedConversationId, messageId)
                    }
                  />
                ) : (
                  <>
                    <div className="communication-chat-content">
                      <MessageList
                        conversation={selectedConversation}
                        messages={selectedMessages}
                        lastSentMessageId={lastSentMessageId}
                        pinnedMessageIds={selectedPinnedMessageIds}
                        openMessageMenuId={openMessageMenuId}
                        onOpenMessageMenu={setOpenMessageMenuId}
                        onCloseMessageMenu={() => setOpenMessageMenuId(null)}
                        onTogglePin={handleTogglePinnedMessage}
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
      {changingGroupNameConversation && (
        <ChangeGroupNameDialog
          conversation={changingGroupNameConversation}
          onCancel={() => setChangingGroupNameConversationId(null)}
          onSave={(name) => {
            if (
              conversationState.changeConversationName(
                changingGroupNameConversationId,
                name,
              )
            ) {
              setChangingGroupNameConversationId(null);
            }
          }}
        />
      )}
    </>
  );
}
