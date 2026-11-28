const CREATED_CLASSES_KEY = "edu_meet_created_classes";
const PREVIOUS_MEETINGS_KEY = "edu_meet_previous_meetings";
const MAX_PREVIOUS_MEETINGS = 20;

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage quota / privacy mode failures
  }
}

export function getMeetingKey(classId, blockId) {
  return `${Number(classId)}:${Number(blockId)}`;
}

export function getCreatedClasses() {
  return readList(CREATED_CLASSES_KEY).filter(
    (item) =>
      Number.isInteger(Number(item?.classId)) &&
      Number(item.classId) > 0 &&
      Number.isInteger(Number(item?.blockId)) &&
      Number(item.blockId) > 0,
  );
}

export function saveCreatedClass(entry) {
  const classId = Number(entry?.classId);
  const blockId = Number(entry?.blockId);
  if (!Number.isInteger(classId) || classId <= 0 || !Number.isInteger(blockId) || blockId <= 0) {
    return getCreatedClasses();
  }

  const normalized = {
    classId,
    blockId,
    subject: String(entry?.subject || "").trim() || `Class ${classId}`,
    section: String(entry?.section || "").trim() || `Block ${blockId}`,
    scheduledTime: String(entry?.scheduledTime || "").trim(),
    createdBy: String(entry?.createdBy || "").trim(),
    createdAt: entry?.createdAt || new Date().toISOString(),
  };

  const targetKey = getMeetingKey(classId, blockId);
  const existing = getCreatedClasses().filter(
    (item) => getMeetingKey(item.classId, item.blockId) !== targetKey,
  );
  const updated = [normalized, ...existing];
  writeList(CREATED_CLASSES_KEY, updated);
  return updated;
}

export function removeCreatedClass(classId, blockId) {
  const targetKey = getMeetingKey(classId, blockId);
  const updated = getCreatedClasses().filter(
    (item) => getMeetingKey(item.classId, item.blockId) !== targetKey,
  );
  writeList(CREATED_CLASSES_KEY, updated);
  return updated;
}

export function getPreviousMeetings() {
  return readList(PREVIOUS_MEETINGS_KEY).filter(
    (item) =>
      Number.isInteger(Number(item?.classId)) &&
      Number(item.classId) > 0 &&
      Number.isInteger(Number(item?.blockId)) &&
      Number(item.blockId) > 0,
  );
}

export function recordPreviousMeeting(entry) {
  const classId = Number(entry?.classId);
  const blockId = Number(entry?.blockId);
  if (!Number.isInteger(classId) || classId <= 0 || !Number.isInteger(blockId) || blockId <= 0) {
    return getPreviousMeetings();
  }

  const normalized = {
    classId,
    blockId,
    subject: String(entry?.subject || "").trim() || `Class ${classId}`,
    section: String(entry?.section || "").trim() || `Block ${blockId}`,
    joinedAt: new Date().toISOString(),
  };

  const targetKey = getMeetingKey(classId, blockId);
  const existing = getPreviousMeetings().filter(
    (item) => getMeetingKey(item.classId, item.blockId) !== targetKey,
  );
  const updated = [normalized, ...existing].slice(0, MAX_PREVIOUS_MEETINGS);
  writeList(PREVIOUS_MEETINGS_KEY, updated);
  return updated;
}
