const GROUP_WINDOW_MS = 5 * 60 * 1000;

function getTimestamp(message) {
  return Date.parse(message.createdAt);
}

function getCalendarDate(message) {
  const timestamp = getTimestamp(message);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function groupMessages(messages) {
  const orderedMessages = [...messages].sort((first, second) => {
    const firstTimestamp = getTimestamp(first);
    const secondTimestamp = getTimestamp(second);

    if (!Number.isFinite(firstTimestamp)) {
      return Number.isFinite(secondTimestamp) ? 1 : 0;
    }

    if (!Number.isFinite(secondTimestamp)) {
      return -1;
    }

    return firstTimestamp - secondTimestamp;
  });

  return orderedMessages.reduce((groups, message) => {
    const currentTimestamp = getTimestamp(message);
    const lastGroup = groups[groups.length - 1];
    const previousMessage =
      lastGroup?.messages[lastGroup.messages.length - 1];
    const previousTimestamp = previousMessage
      ? getTimestamp(previousMessage)
      : Number.NaN;
    const sameCalendarDate =
      previousMessage &&
      getCalendarDate(message) === getCalendarDate(previousMessage);
    const withinGroupWindow =
      Number.isFinite(currentTimestamp) &&
      Number.isFinite(previousTimestamp) &&
      currentTimestamp >= previousTimestamp &&
      currentTimestamp - previousTimestamp <= GROUP_WINDOW_MS;

    if (
      lastGroup &&
      message.senderId &&
      message.senderId === lastGroup.senderId &&
      sameCalendarDate &&
      withinGroupWindow
    ) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        id: message.id,
        senderId: message.senderId,
        direction: message.direction,
        messages: [message],
      });
    }

    return groups;
  }, []);
}
