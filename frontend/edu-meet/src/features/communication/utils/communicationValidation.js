export const MAX_COMMUNICATION_MESSAGE_LENGTH = 2000;

export function validateMessageText(text) {
  if (typeof text !== "string") {
    return {
      valid: false,
      code: "INVALID_MESSAGE",
      message: "Message text is required.",
    };
  }

  const normalizedText = text.trim();
  if (!normalizedText) {
    return {
      valid: false,
      code: "INVALID_MESSAGE",
      message: "Message text is required.",
    };
  }

  if (normalizedText.length > MAX_COMMUNICATION_MESSAGE_LENGTH) {
    return {
      valid: false,
      code: "MESSAGE_TOO_LONG",
      message: "Message text must not exceed 2000 characters.",
    };
  }

  return {
    valid: true,
    text: normalizedText,
  };
}
