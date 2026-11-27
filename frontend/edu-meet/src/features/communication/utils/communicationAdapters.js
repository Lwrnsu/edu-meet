export class CommunicationAdapterError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "CommunicationAdapterError";
    this.code = code;
    this.details = details;
  }
}

function requireObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      `${name} must be an object`,
      { field: name },
    );
  }

  return value;
}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      `${name} must be a nonblank string`,
      { field: name },
    );
  }

  return value;
}

function requireOptionalString(value, name) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      `${name} must be a string or null`,
      { field: name },
    );
  }

  return value;
}

function requireCurrentUserId(currentUserId) {
  if (
    typeof currentUserId !== "string" ||
    currentUserId.trim() === ""
  ) {
    throw new CommunicationAdapterError(
      "CURRENT_USER_REQUIRED",
      "A nonblank currentUserId is required to derive message direction",
    );
  }

  return currentUserId;
}

export function normalizeTimestamp(timestamp, { numericUnit } = {}) {
  if (typeof timestamp === "string") {
    const instantPattern =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:?\d{2})$/;
    const match = instantPattern.exec(timestamp);

    if (!match) {
      throw new CommunicationAdapterError(
        "INVALID_TIMESTAMP",
        "Message timestamp must be an ISO 8601 instant with an explicit timezone",
        { timestamp },
      );
    }

    const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offset] =
      match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);

    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [
      31,
      leapYear ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];

    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > daysInMonth[month - 1] ||
      hour > 23 ||
      minute > 59 ||
      second > 59
    ) {
      throw new CommunicationAdapterError(
        "INVALID_TIMESTAMP",
        "Message timestamp contains an invalid calendar date or time",
        { timestamp },
      );
    }

    if (offset !== "Z") {
      const offsetMatch = /^([+-])(\d{2}):?(\d{2})$/.exec(offset);
      if (
        !offsetMatch ||
        Number(offsetMatch[2]) > 23 ||
        Number(offsetMatch[3]) > 59
      ) {
        throw new CommunicationAdapterError(
          "INVALID_TIMESTAMP",
          "Message timestamp contains an invalid timezone offset",
          { timestamp },
        );
      }
    }

    const parsed = new Date(timestamp);
    if (!Number.isFinite(parsed.getTime())) {
      throw new CommunicationAdapterError(
        "INVALID_TIMESTAMP",
        "Message timestamp is not a valid timestamp",
        { timestamp },
      );
    }

    return {
      createdAt: parsed.toISOString(),
      timestamp: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(parsed),
    };
  }

  if (typeof timestamp === "number") {
    if (numericUnit !== "seconds" && numericUnit !== "milliseconds") {
      throw new CommunicationAdapterError(
        "UNSUPPORTED_NUMERIC_TIMESTAMP",
        "Numeric timestamps require an explicit seconds or milliseconds unit",
        { timestamp },
      );
    }

    if (!Number.isFinite(timestamp)) {
      throw new CommunicationAdapterError(
        "INVALID_TIMESTAMP",
        "Numeric message timestamp must be finite",
        { timestamp, numericUnit },
      );
    }

    const maximumDateMilliseconds = 8640000000000000;
    const milliseconds =
      numericUnit === "seconds" ? timestamp * 1000 : timestamp;
    if (
      !Number.isFinite(milliseconds) ||
      Math.abs(milliseconds) > maximumDateMilliseconds
    ) {
      throw new CommunicationAdapterError(
        "INVALID_TIMESTAMP",
        "Numeric message timestamp is outside the supported date range",
        { timestamp, numericUnit },
      );
    }

    const parsed = new Date(milliseconds);

    if (!Number.isFinite(parsed.getTime())) {
      throw new CommunicationAdapterError(
        "INVALID_TIMESTAMP",
        "Message timestamp is not a valid timestamp",
        { timestamp, numericUnit },
      );
    }

    return {
      createdAt: parsed.toISOString(),
      timestamp: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(parsed),
    };
  }

  throw new CommunicationAdapterError(
    "INVALID_TIMESTAMP",
    "Message timestamp must be an ISO 8601 string or explicitly unitized number",
    { timestamp },
  );
}

export function adaptConversation(
  conversation,
  { numericTimestampUnit } = {},
) {
  const source = requireObject(conversation, "conversation");
  const id = requireString(source.id, "conversation.id");
  const name = source.type === "PRIVATE"
    ? requireOptionalString(source.name, "conversation.name") || "Private chat"
    : requireString(source.name, "conversation.name");
  const avatarUrl = requireOptionalString(
    source.avatarUrl,
    "conversation.avatarUrl",
  );

  if (!Array.isArray(source.participantIds)) {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      "conversation.participantIds must be an array",
      { field: "conversation.participantIds" },
    );
  }

  const participantIds = source.participantIds.map((participantId, index) =>
    requireString(participantId, `conversation.participantIds[${index}]`),
  );

  let type;
  if (source.type === "PRIVATE") {
    type = "individual";
  } else if (source.type === "BLOCK" || source.type === "SUBJECT") {
    type = "group";
  } else {
    throw new CommunicationAdapterError(
      "UNSUPPORTED_CONVERSATION_TYPE",
      "Conversation type is not supported by the frontend",
      { type: source.type },
    );
  }

  const lastMessageText =
    typeof source.lastMessageText === "string"
      ? source.lastMessageText
      : null;
  const preview = lastMessageText ?? "No messages yet.";

  let lastMessageTime = null;
  if (
    source.lastMessageTime !== null &&
    source.lastMessageTime !== undefined
  ) {
    lastMessageTime = normalizeTimestamp(source.lastMessageTime, {
      numericUnit: numericTimestampUnit,
    }).createdAt;
  }

  return {
    id,
    type,
    name,
    avatarUrl,
    participantIds,
    lastMessageText,
    lastMessageTime,
    lastMessageId: source.lastMessageId ?? null,
    lastMessageSenderId: source.lastMessageSenderId ?? null,
    lastMessageSenderName: source.lastMessageSenderName ?? null,
    lastMessageAttachmentContentType: source.lastMessageAttachmentContentType ?? null,
    preview,
  };
}

export function adaptConversations(
  conversations,
  { numericTimestampUnit } = {},
) {
  if (!Array.isArray(conversations)) {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      "conversations must be an array",
    );
  }

  return conversations.map((conversation) =>
    adaptConversation(conversation, { numericTimestampUnit }),
  );
}

export function adaptMember(member, { conversationId } = {}) {
  const source = requireObject(member, "member");
  const id = requireString(source.id, "member.id");
  const name = requireString(source.fullName, "member.fullName");
  const studentId = requireOptionalString(
    source.studentId,
    "member.studentId",
  );
  const avatarUrl = requireOptionalString(
    source.avatarUrl,
    "member.avatarUrl",
  );

  const adapted = {
    id,
    name,
    studentId,
    avatarUrl,
  };

  if (conversationId !== undefined) {
    adapted.conversationId = requireString(
      conversationId,
      "conversationId",
    );
  }

  return adapted;
}

export function adaptMembers(members, { conversationId } = {}) {
  if (!Array.isArray(members)) {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      "members must be an array",
    );
  }

  return members.map((member) =>
    adaptMember(member, { conversationId }),
  );
}

export function adaptMessage(
  message,
  currentUserId,
  { members = [], numericTimestampUnit } = {},
) {
  const source = requireObject(message, "message");
  const id = requireString(source.id, "message.id");
  const conversationId = requireString(
    source.conversationId,
    "message.conversationId",
  );
  const senderId = requireString(source.senderId, "message.senderId");
  const attachment = source.attachment == null ? null : requireObject(source.attachment, "message.attachment");
  const text = attachment && typeof source.text === "string"
    ? source.text
    : requireString(source.text, "message.text");

  const validCurrentUserId = requireCurrentUserId(currentUserId);

  const normalizedTimestamp = normalizeTimestamp(source.timestamp, {
    numericUnit: numericTimestampUnit,
  });

  let sender;
  if (Array.isArray(members)) {
    sender = members.find(
      (member) =>
        member?.id === senderId ||
        member?.senderId === senderId,
    );
  }

  const senderName =
    sender?.fullName ??
    sender?.name ??
    requireOptionalString(source.senderName, "message.senderName");
  const avatarUrl =
    sender?.avatarUrl === undefined ? null : sender.avatarUrl;

  if (typeof avatarUrl !== "string" && avatarUrl !== null) {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      "sender avatarUrl must be a string or null",
    );
  }

  return {
    id,
    conversationId,
    senderId,
    text,
    ...(attachment && {
      attachment: {
        name: requireString(attachment.name, "message.attachment.name"),
        contentType: requireString(attachment.contentType, "message.attachment.contentType"),
        size: attachment.size,
      },
    }),
    direction:
      senderId === validCurrentUserId ? "outgoing" : "incoming",
    senderName,
    avatarUrl,
    timestamp: normalizedTimestamp.timestamp,
    createdAt: normalizedTimestamp.createdAt,
  };
}

export function adaptMessages(
  messages,
  currentUserId,
  options = {},
) {
  requireCurrentUserId(currentUserId);

  if (!Array.isArray(messages)) {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      "messages must be an array",
    );
  }

  const adapted = messages.map((message, index) => {
    try {
      return adaptMessage(message, currentUserId, options);
    } catch (error) {
      if (error instanceof CommunicationAdapterError) {
        throw new CommunicationAdapterError(
          error.code,
          error.message,
          { ...error.details, index },
        );
      }
      throw error;
    }
  });

  return mergeMessages([], adapted);
}

export function mergeMessages(existingMessages, additionalMessages) {
  if (!Array.isArray(existingMessages) || !Array.isArray(additionalMessages)) {
    throw new CommunicationAdapterError(
      "MALFORMED_INPUT",
      "message collections must be arrays",
    );
  }

  const messagesById = new Map();

  // This is a minimal merge for normalized frontend records. Processing existing
  // records first, then additional records, means an additional record replaces
  // the existing record when both carry the same server-generated message ID.
  [...existingMessages, ...additionalMessages].forEach((message) => {
    requireObject(message, "message");
    if (typeof message.id !== "string" || message.id.trim() === "") {
      throw new CommunicationAdapterError(
        "MALFORMED_INPUT",
        "message.id must be a nonblank string",
      );
    }
    messagesById.set(message.id, {
      ...message,
      senderName: message.senderName ?? messagesById.get(message.id)?.senderName ?? null,
    });
  });

  return [...messagesById.values()].sort((first, second) => {
    const firstTime = Date.parse(first.createdAt);
    const secondTime = Date.parse(second.createdAt);
    if (!Number.isFinite(firstTime) && !Number.isFinite(secondTime)) {
      return 0;
    }
    if (!Number.isFinite(firstTime)) {
      return 1;
    }
    if (!Number.isFinite(secondTime)) {
      return -1;
    }
    return firstTime - secondTime || (first.id < second.id ? -1 : Number(first.id > second.id));
  });
}
