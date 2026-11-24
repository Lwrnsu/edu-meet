const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchAnnouncements() {
  const res = await fetch(`${API_BASE}/announcements.php`);
  const json = await res.json();
  if (!res.ok || !json.response) {
    throw new Error(json.message || "Failed to load announcements");
  }
  return json.body; 
}

export async function createAnnouncement(payload) {
  const res = await fetch(`${API_BASE}/announcements.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.response) {
    throw new Error(json.message || "Failed to create announcement");
  }
  return json.body; 
}

export async function fetchNotifications(userId) {
  const res = await fetch(`${API_BASE}/notifications.php?user_id=${encodeURIComponent(userId)}`);
  const json = await res.json();
  if (!res.ok || !json.response) {
    throw new Error(json.message || "Failed to load notifications");
  }
  return json.body; 
}

export async function markNotificationRead(notificationId, userId) {
  const res = await fetch(`${API_BASE}/notifications.php`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notification_id: Number(notificationId),
      user_id: Number(userId),
      is_read: true,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.response) {
    throw new Error(json.message || "Failed to mark notification as read");
  }
  return json.body; 
}