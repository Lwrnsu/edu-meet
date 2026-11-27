import mockConversations from "./mockConversations.js";
import mockMembers from "./mockMembers.js";
import mockMessagesByConversationId from "./mockMessages.js";
import mockPinnedMessageIdsByConversationId from "./mockPinnedMessages.js";

const mockCommunicationProvider = {
  getInitialState() {
    return {
      conversations: mockConversations.map((conversation) => ({
        ...conversation,
      })),
      messagesByConversationId: Object.fromEntries(
        Object.entries(mockMessagesByConversationId).map(
          ([conversationId, messages]) => [
            conversationId,
            messages.map((message) => ({ ...message })),
          ],
        ),
      ),
      members: mockMembers.map((member) => ({ ...member })),
      pinnedMessageIdsByConversationId: Object.fromEntries(
        Object.entries(mockPinnedMessageIdsByConversationId).map(
          ([conversationId, messageIds]) => [
            conversationId,
            [...messageIds],
          ],
        ),
      ),
    };
  },
};

export default mockCommunicationProvider;
