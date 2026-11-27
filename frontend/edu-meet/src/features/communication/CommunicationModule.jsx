import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ChatHeader from "./components/ChatHeader.jsx";
import ChatMembersView from "./components/ChatMembersView.jsx";
import PinnedMessagesView from "./components/PinnedMessagesView.jsx";
import RenameGroupDialog from "./components/RenameGroupDialog.jsx";
import LeaveGroupDialog from "./components/LeaveGroupDialog.jsx";
import MessageInput from "./components/MessageInput.jsx";
import MessageList from "./components/MessageList.jsx";
import MediaViewer from "./components/MediaViewer.jsx";
import ConversationPanel from "./components/ConversationPanel.jsx";
import mockCommunicationProvider from "./data/mockCommunicationProvider.js";
import useConversations from "./hooks/useConversations.js";
import usePinnedMessages from "./hooks/usePinnedMessages.js";
import useChat from "./hooks/useChat.js";
import { createCommunicationApi } from "./services/communicationApi.js";
import { adaptMembers } from "./utils/communicationAdapters.js";
import { reconcileConversationPreview } from "./utils/conversationPreview.js";
import "./styles/communication.css";

export default function CommunicationModule({ currentUserId, accessToken }) {
  const live = Boolean(currentUserId && accessToken);
  const api = useMemo(() => createCommunicationApi({ accessToken }), [accessToken]);
  const [initialMockData] = useState(() => live ? null : mockCommunicationProvider.getInitialState());
  const [mockPinsByConversation, setMockPinsByConversation] = useState(
    () => initialMockData?.pinnedMessageIdsByConversationId ?? {},
  );
  const [membersByConversationId, setMembersByConversationId] = useState({});
  const [memberError, setMemberError] = useState(null);
  const [renameConversationId, setRenameConversationId] = useState(null);
  const [viewingMedia, setViewingMedia] = useState(null);
  const conversationState = useConversations({
    initialConversations: initialMockData?.conversations ?? [],
    currentUserId: live ? currentUserId : undefined,
    api,
    membersByConversationId,
  });
  const {
    selectedConversation,
    selectedConversationId,
    activeChatPanelView,
    leaveGroupConversationId,
    handleConversationUnavailable,
  } = conversationState;
  const chatState = useChat({
    initialMessagesByConversationId: initialMockData?.messagesByConversationId ?? {},
    currentUserId: live ? currentUserId : undefined,
    api,
    live,
    conversationId: selectedConversation?.id,
    onConversationUnavailable: handleConversationUnavailable,
  });
  const selectedMembers = live
    ? membersByConversationId[selectedConversationId] ?? []
    : initialMockData.members.filter((member) => member.conversationId === selectedConversationId);

  const mediaConversationId = selectedConversation?.id;
  if (viewingMedia && viewingMedia.conversationId !== mediaConversationId) {
    setViewingMedia(null);
  }

  function openMedia(attachment, trigger) {
    setViewingMedia({ attachment, trigger, conversationId: selectedConversationId });
  }

  function withSender(message) {
    if (!live) return message;
    const sender = selectedMembers.find((member) => member.id === message.senderId);
    const senderName = message.direction === "outgoing" ? "You" : sender?.name ?? message.senderName ?? "Chat member";
    const attachment = message.attachment;
    return {
      ...message,
      senderName,
      avatarUrl: sender?.avatarUrl ?? null,
      ...(attachment && {
        attachment: {
          ...attachment,
          downloadUrl: api.attachmentUrl(message.conversationId, message.id),
          accessToken,
        },
      }),
    };
  }

  const selectedMessages = (chatState.messagesByConversationId[selectedConversationId] ?? []).map(withSender);
  const conversations = conversationState.conversations.map((conversation) => {
    const messages = chatState.messagesByConversationId[conversation.id];
    const latest = messages?.at(-1);
    if (live) {
      return reconcileConversationPreview(
        conversation, latest, currentUserId, membersByConversationId[conversation.id],
      );
    }
    if (!latest) {
      return { ...conversation, preview: conversation.preview ?? "No messages yet." };
    }
    const member = membersByConversationId[conversation.id]?.find(({ id }) => id === latest.senderId);
    const senderName = member?.name || latest.senderName;
    const sender = latest.direction === "outgoing" ? "You" : senderName?.trim().split(/\s+/, 1)[0];
    let preview = latest.text;
    if (latest.attachment) {
      preview = latest.attachment.contentType?.startsWith("image/") ? "Sent an image" : "Sent a file";
    }
    return {
      ...conversation,
      preview: sender ? `${sender}: ${preview}` : preview,
      lastMessageTime: latest.createdAt,
    };
  });
  if (live) {
    conversations.sort((first, second) =>
      (second.lastMessageTime ?? "").localeCompare(first.lastMessageTime ?? ""),
    );
  }
  const lastSentMessageId = chatState.lastSentMessageId;
  const menuTriggerRef = useRef(null);
  const conversationSearchRef = useRef(null);
  const dialogCloseIntentRef = useRef(null);
  const selectedPinnedMessageIds = mockPinsByConversation[selectedConversationId] ?? [];
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
    Boolean(selectedConversation);

  const liveConversationId = live ? selectedConversation?.id : null;
  const pins = usePinnedMessages(liveConversationId, currentUserId, showingPinnedMessages, api, {
    pinChanges: chatState.pinChangesByConversation[liveConversationId],
    connected: chatState.connectionState === "open",
  });
  const pinnedIds = new Set(live
    ? pins.messages?.map((message) => message.id)
    : selectedPinnedMessageIds);

  function setMockPin(messageId, pinned) {
    setMockPinsByConversation((current) => {
      const ids = new Set(current[selectedConversationId]);
      if (pinned) ids.add(messageId);
      else ids.delete(messageId);
      return { ...current, [selectedConversationId]: [...ids] };
    });
  }

  const updatePin = live ? pins.updatePin : setMockPin;

  function closeRename() {
    setRenameConversationId(null);
    requestAnimationFrame(() => menuTriggerRef.current?.focus());
  }

  const memberConversationId = selectedConversation?.id;
  useEffect(() => {
    if (!live || !memberConversationId) return;

    const controller = new AbortController();
    const { signal } = controller;
    api.getMembers(memberConversationId, { signal })
      .then((payload) => {
        if (signal.aborted) return;
        const members = adaptMembers(payload);
        setMemberError(null);
        setMembersByConversationId((current) => ({ ...current, [memberConversationId]: members }));
      })
      .catch((error) => {
        if (signal.aborted) return;
        if (error.status === 403 || error.status === 404) {
          handleConversationUnavailable(memberConversationId, error.message);
        } else {
          setMemberError({ conversationId: memberConversationId, message: error.message });
        }
      });
    return () => controller.abort();
  }, [api, live, currentUserId, memberConversationId, showingMembers, handleConversationUnavailable]);

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
    if (action === "rename-group" && conversation.type === "group") {
      setRenameConversationId(conversation.id);
      return;
    }
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
    return conversationState.handleConfirmLeaveGroup();
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
            status={conversationState.isLoading ? "Loading conversations…" : null}
            error={conversationState.error}
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
                  memberError?.conversationId === selectedConversationId ? <p role="alert">{memberError.message}</p> : (
                    <ChatMembersView
                      conversation={selectedConversation}
                      members={selectedMembers}
                    />
                  )
                ) : showingPinnedMessages ? (
                  <PinnedMessagesView
                    conversation={selectedConversation}
                    onOpenMedia={openMedia}
                    messages={live ? (pins.messages ?? []).map(withSender) : selectedPinnedMessages}
                    isLoading={live && !pins.messages && !pins.error}
                    error={pins.error}
                    isUpdating={Boolean(pins.pendingMessageId)}
                    onUnpin={(messageId) => updatePin(messageId, false)}
                  />
                ) : (
                  <>
                    {live && chatState.connectionState !== "open" && (
                      <p className="communication-chat-notice" role="status">
                        {["connecting", "disconnected"].includes(chatState.connectionState)
                          ? "Connecting to live chat…"
                          : "Chat disconnected. Refresh the page to reconnect."}
                      </p>
                    )}
                    {chatState.error && <p className="communication-chat-notice" role="alert">{chatState.error}</p>}
                    {chatState.historyError && <p className="communication-chat-notice" role="alert">{chatState.historyError}</p>}
                    {chatState.isLoading && chatState.connectionState === "open" && (
                      <p className="communication-chat-notice" role="status">Loading messages…</p>
                    )}
                    {pins.error && <p className="communication-chat-notice" role="alert">{pins.error}</p>}
                    <div className="communication-chat-content">
                      <MessageList
                        key={selectedConversation.id}
                        conversation={selectedConversation}
                        messages={selectedMessages}
                        historyReady={!chatState.isLoading && !chatState.historyError}
                        lastSentMessageId={lastSentMessageId}
                        older={chatState.older}
                        onLoadOlder={chatState.loadOlderMessages}
                        onOpenMedia={openMedia}
                        pinnedIds={pinnedIds}
                        isUpdatingPin={Boolean(pins.pendingMessageId)}
                        onTogglePin={!live || (liveConversationId && pins.messages)
                          ? (id) => updatePin(id, !pinnedIds.has(id))
                          : undefined}
                      />
                    </div>
                    <MessageInput
                      key={selectedConversationId}
                      onSendMessage={handleSendMessage}
                      onSendAttachment={live
                        ? (file, text) => chatState.sendAttachment(selectedConversationId, file, text)
                        : undefined}
                      sendDisabled={live && (chatState.connectionState !== "open" || chatState.isLoading || Boolean(chatState.historyError))}
                    />
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
      {viewingMedia && viewingMedia.conversationId === mediaConversationId && (
        <MediaViewer
          attachment={viewingMedia.attachment}
          trigger={viewingMedia.trigger}
          onClose={() => setViewingMedia(null)}
        />
      )}
      {renameConversationId !== null && renameConversationId === selectedConversation?.id && (
        <RenameGroupDialog
          name={selectedConversation.name}
          onClose={closeRename}
          onSave={(name) => conversationState.renameConversation(renameConversationId, name)}
        />
      )}
      {leaveGroupConversationId !== null && (
        <LeaveGroupDialog
          onCancel={handleCancelLeaveGroup}
          onConfirm={handleConfirmLeaveGroup}
        />
      )}
    </>
  );
}
