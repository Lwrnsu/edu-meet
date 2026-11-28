import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getAuthBearerToken } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";
import {
  getCreatedClasses,
  getPreviousMeetings,
  getMeetingKey,
  saveCreatedClass,
} from "./classMeetingsStore";

const actions = [
  {
    label: "New",
    icon: "https://c.animaapp.com/9ll31gL1/img/mask-group-9@2x.png",
  },
  {
    label: "Join",
    icon: "https://c.animaapp.com/9ll31gL1/img/mask-group-10@2x.png",
  },
  {
    label: "Previous",
    icon: "https://c.animaapp.com/9ll31gL1/img/mask-group-11@2x.png",
  },
  {
    label: "Scheduled",
    icon: "https://c.animaapp.com/9ll31gL1/img/mask-group-12@2x.png",
  },
];

const avatarColors = ["#9c83f6", "#3e7af7", "#0f7a5a", "#d97706", "#a453fd"];
const apiUrl = import.meta.env.DEV ? import.meta.env.VITE_API_URL ?? "" : "";

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem("edu_meet_cached_user") || "null");
  } catch {
    return null;
  }
}

function getInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : (words[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function getDisplayName(user) {
  return (
    user?.display_name ||
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Edu-Meet user"
  );
}

function formatCurrentDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatCurrentTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export const Lobby = () => {
  const navigate = useNavigate();
  const { user: authenticatedUser } = useAuth();
  const [cachedUser] = useState(getCachedUser);
  const [activeAction, setActiveAction] = useState("Join");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [activeMeetings, setActiveMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joiningMeeting, setJoiningMeeting] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [createdClasses, setCreatedClasses] = useState(getCreatedClasses);
  const [previousMeetings] = useState(getPreviousMeetings);
  const [classOptions, setClassOptions] = useState([]);
  const [classOptionsLoading, setClassOptionsLoading] = useState(true);
  const [classOptionsError, setClassOptionsError] = useState("");
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [newClassSelection, setNewClassSelection] = useState("");
  const [newScheduledTime, setNewScheduledTime] = useState("");
  const [newMeetingError, setNewMeetingError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const loadClassOptions = async () => {
      try {
        const authToken = getAuthBearerToken();
        if (!authToken) {
          throw new Error("Sign in to see your assigned class sections.");
        }

        const response = await fetch(`${apiUrl}/api/room/classes`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.message || data.error || "Could not load assigned class sections.");
        }

        if (active) {
          const options = Array.isArray(data) ? data : [];
          setClassOptions(options);
          setNewClassSelection((current) =>
            options.some(
              (option) => getMeetingKey(option.classId, option.blockId) === current,
            )
              ? current
              : options[0]
                ? getMeetingKey(options[0].classId, options[0].blockId)
                : "",
          );
          setClassOptionsError("");
        }
      } catch (loadError) {
        if (active) {
          setClassOptionsError(loadError.message || "Could not load assigned class sections.");
        }
      } finally {
        if (active) setClassOptionsLoading(false);
      }
    };

    loadClassOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let loading = false;

    const loadActiveMeetings = async () => {
      if (loading) return;
      loading = true;

      try {
        const authToken = getAuthBearerToken();
        if (!authToken) {
          throw new Error("Sign in to see your active class meetings.");
        }

        const response = await fetch(`${apiUrl}/api/room/active`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            data.message || data.error || "Could not load active meetings.",
          );
        }

        if (active) {
          setActiveMeetings(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Could not load active meetings.");
      } finally {
        loading = false;
        if (active) setIsLoading(false);
      }
    };

    loadActiveMeetings();
    const interval = window.setInterval(loadActiveMeetings, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleAction = (label) => {
    setActiveAction(label);
    setActionMessage("");
    if (label === "New") {
      setIsNewMeetingOpen(true);
      return;
    }
    if (label === "Join") {
      setActionMessage("");
      return;
    }
    setActionMessage("");
  };

  const handleJoinMeeting = (meeting) => {
    setJoinError("");
    setJoiningMeeting(`${meeting.classId}:${meeting.blockId}`);
    navigate("/video-conference", {
      state: {
        classId: meeting.classId,
        blockId: meeting.blockId,
      },
    });
  };

  const handleCreateMeeting = (event) => {
    event.preventDefault();
    setNewMeetingError("");
    const selectedClass = classOptions.find(
      (option) => getMeetingKey(option.classId, option.blockId) === newClassSelection,
    );
    if (!selectedClass) {
      setNewMeetingError("Choose a class section assigned to your account.");
      return;
    }
    const updated = saveCreatedClass({
      classId: selectedClass.classId,
      blockId: selectedClass.blockId,
      subject: selectedClass.subject,
      section: selectedClass.section,
      scheduledTime: newScheduledTime,
      createdBy: displayName,
    });
    setCreatedClasses(updated);
    setIsNewMeetingOpen(false);
    setNewClassSelection(getMeetingKey(selectedClass.classId, selectedClass.blockId));
    setNewScheduledTime("");
    setActiveAction("Scheduled");
  };

  const user = authenticatedUser || cachedUser;
  const displayName = getDisplayName(user);
  const email = user?.email || "";
  const assignedClassKeys = new Set(
    classOptions.map((option) => getMeetingKey(option.classId, option.blockId)),
  );
  const authorizedCreatedClasses =
    classOptionsLoading || classOptionsError
      ? []
      : createdClasses.filter((meeting) =>
          assignedClassKeys.has(getMeetingKey(meeting.classId, meeting.blockId)),
        );
  const ongoingMeetings = [
    ...activeMeetings,
    ...authorizedCreatedClasses
      .filter(
        (created) =>
          !activeMeetings.some(
            (active) =>
              getMeetingKey(active.classId, active.blockId) ===
              getMeetingKey(created.classId, created.blockId),
          ),
      )
      .map((created) => ({ ...created, participants: [] })),
  ];

  return (
    <div className="lobby-page min-h-screen w-full bg-variable-collection-moodboard-2-pale-blue">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-4 md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <img
                  className="h-[64px] w-[64px] md:h-[90px] md:w-[90px]"
                  alt="Edu-Meet logo"
                  src="https://c.animaapp.com/9ll31gL1/img/mask-group-8@2x.png"
                />
                <h1 className="font-poppins-h1 text-[32px] leading-none text-color-scheme-grays-black md:text-[48px]">
                  EDU-MEET
                </h1>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="text-right">
                  <p className="font-h5 text-[14px] leading-tight text-moodboard-2dull-blue md:text-[18px]">
                    {email}
                  </p>
                  <p className="font-h5 text-[14px] leading-tight text-moodboard-2dull-blue md:text-[18px]">
                    {displayName}
                  </p>
                </div>
                <span
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-moodboard-2midnight-blue font-poppins-h3 text-[16px] text-white md:h-[62px] md:w-[62px] md:text-[20px]"
                  role="img"
                  aria-label={`${displayName} profile`}
                >
                  {getInitials(displayName)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-moodboard-2dull-blue">
              <time
                className="font-poppins-h3 text-[20px] md:text-[24px]"
                dateTime={now.toISOString()}
              >
                {formatCurrentDate(now)}
              </time>
              <span
                className="hidden h-6 w-px bg-moodboard-1light-gray-ish-blue md:block"
                aria-hidden="true"
              />
              <time
                className="font-poppins-h3 text-[20px] md:text-[24px]"
                dateTime={now.toISOString()}
              >
                {formatCurrentTime(now)}
              </time>
            </div>
          </div>
        </header>

        <main className="flex flex-col gap-6">
          <nav
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Meeting actions"
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[18px] bg-moodboard-3white px-4 py-3 shadow-[0px_4px_4px_#00000040] transition md:min-h-[75px] md:gap-4 ${
                  activeAction === action.label
                    ? "ring-2 ring-moodboard-2light-purple"
                    : ""
                }`}
                aria-pressed={activeAction === action.label}
                onClick={() => handleAction(action.label)}
              >
                <img
                  className="h-6 w-6 shrink-0 md:h-[30px] md:w-[30px]"
                  alt=""
                  aria-hidden="true"
                  src={action.icon}
                />
                <span className="font-poppins-h3 text-[20px] leading-none text-moodboard-2midnight-blue md:text-[24px]">
                  {action.label}
                </span>
              </button>
            ))}
          </nav>

          <section
            aria-labelledby="meeting-list-heading"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="meeting-list-heading"
                className="font-poppins-h3 text-[26px] text-moodboard-2midnight-blue md:text-[32px]"
              >
                {activeAction === "Scheduled"
                  ? "Scheduled Classes"
                  : activeAction === "Previous"
                    ? "Previous Meetings"
                    : "Ongoing Meetings"}
              </h2>
              {activeAction === "Join" && (
                <span className="font-h5 text-[14px] text-moodboard-2dull-blue md:text-[16px]">
                  Assigned to you · joinable now
                </span>
              )}
            </div>

            {actionMessage && (
              <p className="rounded-xl bg-moodboard-2warm-white p-4 text-moodboard-2dull-blue">
                {actionMessage}
              </p>
            )}
            {error && (
              <p className="rounded-xl border border-red-300 bg-white p-4 text-red-700" role="alert">
                {error}
              </p>
            )}
            {joinError && (
              <p className="rounded-xl border border-red-300 bg-white p-4 text-red-700" role="alert">
                {joinError}
              </p>
            )}

            {activeAction === "Scheduled" ? (
              classOptionsLoading ? (
                <p className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-6 text-moodboard-2dull-blue">
                  Loading your assigned class sections…
                </p>
              ) : classOptionsError ? (
                <p className="rounded-[18px] border border-red-300 bg-white p-6 text-red-700" role="alert">
                  Could not verify your assigned class sections: {classOptionsError}
                </p>
              ) : authorizedCreatedClasses.length === 0 ? (
                <p className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-6 text-moodboard-2dull-blue">
                  No scheduled classes yet. Use New to pre-create a joinable class.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {authorizedCreatedClasses.map((meeting) => (
                    <article
                      key={getMeetingKey(meeting.classId, meeting.blockId)}
                      className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-4 md:p-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-poppins-h3 text-[22px] leading-tight text-color-scheme-grays-black md:text-[30px]">
                            {meeting.subject}
                          </h3>
                          <p className="mt-2 font-h5 text-[16px] text-moodboard-2dull-blue md:text-[18px]">
                            {meeting.section}
                            {meeting.scheduledTime ? ` · ${meeting.scheduledTime}` : " · Ready to join"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="self-start rounded-[14px] bg-moodboard-2light-purple px-5 py-3 font-poppins-h3 text-[18px] leading-none text-white transition hover:opacity-90 md:self-auto md:text-[20px]"
                          onClick={() => handleJoinMeeting(meeting)}
                        >
                          JOIN
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : activeAction === "Previous" ? (
              previousMeetings.length === 0 ? (
                <p className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-6 text-moodboard-2dull-blue">
                  No previous meetings yet.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {previousMeetings.map((meeting) => (
                    <article
                      key={getMeetingKey(meeting.classId, meeting.blockId)}
                      className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-4 md:p-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-poppins-h3 text-[22px] leading-tight text-color-scheme-grays-black md:text-[30px]">
                            {meeting.subject}
                          </h3>
                          <p className="mt-2 font-h5 text-[16px] text-moodboard-2dull-blue md:text-[18px]">
                            {meeting.section}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="self-start rounded-[14px] bg-moodboard-2light-purple px-5 py-3 font-poppins-h3 text-[18px] leading-none text-white transition hover:opacity-90 md:self-auto md:text-[20px]"
                          onClick={() => handleJoinMeeting(meeting)}
                        >
                          JOIN AGAIN
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : isLoading ? (
              <p className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-6 text-moodboard-2dull-blue">
                Checking your assigned rooms for live participants…
              </p>
            ) : !error && ongoingMeetings.length === 0 ? (
              <p className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-6 text-moodboard-2dull-blue">
                None of your assigned classes are joinable right now. This list updates automatically.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {ongoingMeetings.map((meeting) => {
                  const participants = Array.isArray(meeting.participants)
                    ? meeting.participants
                    : [];
                  const visibleParticipants = participants.slice(0, 8);

                  return (
                    <article
                      key={`${meeting.classId}:${meeting.blockId}`}
                      className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-4 md:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <h3 className="font-poppins-h3 text-[22px] leading-tight text-color-scheme-grays-black md:text-[30px]">
                              {meeting.subject}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-[16px] text-color-scheme-grays-black md:text-[20px]">
                              <span className="font-subtext-semibold">
                                {meeting.section}
                              </span>
                              <span
                                className="hidden h-5 w-px bg-moodboard-1light-gray-ish-blue sm:block"
                                aria-hidden="true"
                              />
                              <span className="inline-flex items-center gap-2 font-subtext-semibold text-moodboard-2dull-blue">
                                <span
                                  className="h-2.5 w-2.5 rounded-full bg-green-600"
                                  aria-hidden="true"
                                />
                                {participants.length}{" "}
                                {participants.length === 1 ? "person" : "people"} in the room
                              </span>
                            </div>
                          </div>

                          <div
                            className="flex flex-wrap items-center gap-0"
                            aria-label={`${participants.length} people currently in the meeting`}
                          >
                            {visibleParticipants.map((name, index) => (
                              <span
                                key={`${name}-${index}`}
                                className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-moodboard-2warm-white font-poppins-h3 text-[12px] text-white first:ml-0 md:h-11 md:w-11"
                                style={{
                                  backgroundColor: avatarColors[index % avatarColors.length],
                                  zIndex: visibleParticipants.length - index,
                                }}
                                title={name}
                                aria-label={name}
                              >
                                {getInitials(name)}
                              </span>
                            ))}
                            {participants.length > visibleParticipants.length && (
                              <span className="ml-2 font-h5 text-[16px] text-moodboard-2light-purple md:text-[18px]">
                                +{participants.length - visibleParticipants.length} more
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="self-start rounded-[14px] bg-moodboard-2light-purple px-5 py-3 font-poppins-h3 text-[18px] leading-none text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moodboard-2midnight-blue disabled:cursor-wait disabled:opacity-70 md:self-auto md:text-[20px]"
                          disabled={joiningMeeting !== null}
                          onClick={() => handleJoinMeeting(meeting)}
                        >
                          {joiningMeeting === `${meeting.classId}:${meeting.blockId}`
                            ? "JOINING…"
                            : "JOIN"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {isNewMeetingOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-moodboard-2midnight-blue/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-meeting-title"
        >
          <form
            className="w-full max-w-[520px] rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-5 md:p-6"
            onSubmit={handleCreateMeeting}
          >
            <h2
              id="new-meeting-title"
              className="font-poppins-h3 text-[24px] text-moodboard-2midnight-blue md:text-[28px]"
            >
              Pre-create a class meeting
            </h2>
            <label className="mt-5 flex flex-col gap-2 font-h5 text-[15px] text-moodboard-2dull-blue">
              Class section
              <select
                value={newClassSelection}
                onChange={(event) => setNewClassSelection(event.target.value)}
                className="h-[48px] rounded-[12px] border border-moodboard-1light-gray-ish-blue bg-white px-3 text-moodboard-2midnight-blue"
                required
                disabled={classOptionsLoading || classOptions.length === 0}
              >
                <option value="">
                  {classOptionsLoading ? "Loading assigned classes…" : "Choose a class section"}
                </option>
                {classOptions.map((option) => (
                  <option
                    key={getMeetingKey(option.classId, option.blockId)}
                    value={getMeetingKey(option.classId, option.blockId)}
                  >
                    {option.subject} — {option.section} (class {option.classId}, block {option.blockId})
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-sm text-moodboard-2dull-blue">
              A scheduled meeting uses an existing class section; it does not create a course or change enrollment.
            </p>
            {classOptionsError && (
              <p className="mt-3 rounded-[12px] border border-red-300 bg-white p-3 text-red-700" role="alert">
                {classOptionsError}
              </p>
            )}
            {!classOptionsLoading && !classOptionsError && classOptions.length === 0 && (
              <p className="mt-3 rounded-[12px] border border-amber-300 bg-white p-3 text-amber-800" role="status">
                No class sections are assigned to your account.
              </p>
            )}
            <label className="mt-4 flex flex-col gap-2 font-h5 text-[15px] text-moodboard-2dull-blue">
              Scheduled time (optional)
              <input
                type="datetime-local"
                value={newScheduledTime}
                onChange={(event) => setNewScheduledTime(event.target.value)}
                className="h-[48px] rounded-[12px] border border-moodboard-1light-gray-ish-blue bg-white px-3 text-moodboard-2midnight-blue"
              />
            </label>
            {newMeetingError && (
              <p className="mt-4 rounded-[12px] border border-red-300 bg-white p-3 text-red-700" role="alert">
                {newMeetingError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-[12px] border border-moodboard-1light-gray-ish-blue px-5 py-3 font-poppins-h3 text-[16px] text-moodboard-2dull-blue"
                onClick={() => {
                  setIsNewMeetingOpen(false);
                  setNewMeetingError("");
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="rounded-[12px] bg-moodboard-2light-purple px-5 py-3 font-poppins-h3 text-[16px] text-moodboard-2midnight-blue"
                disabled={classOptionsLoading || classOptions.length === 0}
              >
                CREATE
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="fixed bottom-6 right-4 z-10 md:bottom-8 md:right-8">
        <button
          type="button"
          className="flex items-center gap-1"
          aria-label="Open assistant"
          aria-expanded={isAssistantOpen}
          onClick={() => setIsAssistantOpen((current) => !current)}
        >
          <span className="relative flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full border border-solid border-black bg-variable-collection-moodboard-2-pale-blue">
            <img
              className="h-[34px] w-[34px] object-cover"
              alt=""
              aria-hidden="true"
              src="https://c.animaapp.com/9ll31gL1/img/image-84@2x.png"
            />
          </span>
          <span
            className="h-[13px] w-3 rounded-[6px/6.5px] border border-solid border-black bg-variable-collection-moodboard-2-pale-blue"
            aria-hidden="true"
          />
          <span
            className="h-[5px] w-[5px] rounded-full border border-solid border-black bg-variable-collection-moodboard-2-pale-blue"
            aria-hidden="true"
          />
        </button>
      </div>

      {isAssistantOpen && (
        <div
          className="fixed bottom-24 right-4 z-20 w-[260px] rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-5 shadow-[0px_4px_4px_#00000040] md:right-8"
          role="status"
        >
          <p className="font-subtext-semibold text-moodboard-2midnight-blue">
            How can I help you?
          </p>
          <p className="mt-2 font-small-text text-moodboard-2dull-blue">
            Your Edu-Meet assistant is ready.
          </p>
        </div>
      )}
    </div>
  );
};
