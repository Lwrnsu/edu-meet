import ConversationAvatar from "./ConversationAvatar.jsx";
import chatMembersIcon from "../assets/chat-members.png";
import leaveGroupIcon from "../assets/leave-group.png";
import menuDivider from "../assets/menu-divider.svg";
import pinnedMessagesIcon from "../assets/pinned-messages.png";

const menuActions = [
  {
    action: "view-members",
    label: "View Chat Members",
    icon: chatMembersIcon,
    className: "communication-options-members",
  },
  {
    action: "pinned-messages",
    label: "Pinned Messages",
    icon: pinnedMessagesIcon,
    className: "communication-options-pinned",
  },
  {
    action: "leave-group",
    label: "Leave Group",
    icon: leaveGroupIcon,
    className: "communication-options-leave",
  },
];

export default function ChatOptionsMenu({
  conversation,
  id,
  menuRef,
  onAction,
  onDismiss,
  position,
  live = false,
}) {
  if (!conversation) {
    return null;
  }
  const isGroup = conversation.type === "group";
  const pinsUnavailable = live && !isGroup;
  const visibleActions = menuActions.filter(({ action }) =>
    isGroup ? !live || action !== "leave-group" : action === "pinned-messages",
  );

  function handleKeyDown(event) {
    const items = Array.from(
      menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [],
    );

    if (!items.length) {
      return;
    }

    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex;

    switch (event.key) {
      case "ArrowDown":
        nextIndex =
          currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        break;
      case "ArrowUp":
        nextIndex =
          currentIndex < 0
            ? items.length - 1
            : (currentIndex - 1 + items.length) % items.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    items[nextIndex]?.focus();
  }

  return (
    <div
      className="communication-options-menu"
      id={id}
      ref={menuRef}
      role="menu"
      aria-label={`${conversation.name} ${isGroup ? "group" : "conversation"} options`}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          !(nextTarget instanceof Node) ||
          !event.currentTarget.contains(nextTarget)
        ) {
          onDismiss?.();
        }
      }}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <div className="communication-options-profile">
        <ConversationAvatar
          type={conversation.type}
          imageUrl={conversation.avatarUrl}
          size={80}
        />
        <h3 className="communication-options-name">{conversation.name}</h3>
        {isGroup && (
          <button
            className="communication-options-change-profile"
            type="button"
            role="menuitem"
            onClick={() => onAction?.("rename-group", conversation)}
          >
            Change Group Name
          </button>
        )}
      </div>

      {isGroup && (
        <img
          className="communication-options-divider"
          src={menuDivider}
          alt=""
          aria-hidden="true"
        />
      )}

      <div className="communication-options-actions">
        {visibleActions.map((item) => (
          <button
            className={`communication-options-action ${item.className}`}
            key={item.action}
            type="button"
            role="menuitem"
            aria-disabled={pinsUnavailable || undefined}
            aria-describedby={pinsUnavailable ? `${id}-pins-unavailable` : undefined}
            onClick={pinsUnavailable ? undefined : () => onAction?.(item.action, conversation)}
          >
            <img src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
        {pinsUnavailable && (
          <p className="communication-options-unavailable" id={`${id}-pins-unavailable`}>
            Pinning is available in group chats.
          </p>
        )}
      </div>
    </div>
  );
}
