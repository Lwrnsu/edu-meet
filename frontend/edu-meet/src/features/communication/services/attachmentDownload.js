export async function fetchChatAttachment(attachment, { signal } = {}) {
  const response = await fetch(attachment.downloadUrl, {
    headers: { Authorization: `Bearer ${attachment.accessToken}` },
    signal,
  });
  if (!response.ok) throw new Error("Could not load this attachment.");
  return response.blob();
}

export async function downloadChatAttachment(attachment) {
  const blob = await fetchChatAttachment(attachment);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
