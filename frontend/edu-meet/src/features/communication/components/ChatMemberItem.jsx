import ConversationAvatar from "./ConversationAvatar.jsx";

export default function ChatMemberItem({ member }) {
  return (
    <li className="communication-chat-member">
      <ConversationAvatar
        type="individual"
        imageUrl={member.avatarUrl}
        size={50}
      />
      <div className="communication-chat-member-copy">
        <span className="communication-chat-member-name">{member.name}</span>
        <span className="communication-chat-member-student-id">
          {member.studentId}
        </span>
      </div>
    </li>
  );
}
