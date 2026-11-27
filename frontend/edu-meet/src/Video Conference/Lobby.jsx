import { useState } from "react";

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

const participantAvatars = Array.from({ length: 8 }, (_, index) => ({
  id: `participant-${index + 1}`,
  src: "https://c.animaapp.com/9ll31gL1/img/mask-group-7@2x.png",
}));

export const Lobby = () => {
  const [activeAction, setActiveAction] = useState(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const handleAction = (label) => {
    setActiveAction(label);
    if (label === "Join") {
      setIsJoinDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen w-full bg-variable-collection-moodboard-2-pale-blue">
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
                    202614367@schoolemail.edu.ph
                  </p>
                  <p className="font-h5 text-[14px] leading-tight text-moodboard-2dull-blue md:text-[18px]">
                    JOHN MARTIN REYES
                  </p>
                </div>
                <img
                  className="h-[52px] w-[52px] rounded-full object-cover md:h-[62px] md:w-[62px]"
                  alt="John Martin Reyes profile"
                  src="https://c.animaapp.com/9ll31gL1/img/profile@2x.png"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-moodboard-2dull-blue">
              <time
                className="font-poppins-h3 text-[20px] md:text-[24px]"
                dateTime="2026-10-30"
              >
                October 30, Fri
              </time>
              <span
                className="hidden h-6 w-px bg-moodboard-1light-gray-ish-blue md:block"
                aria-hidden="true"
              />
              <time
                className="font-poppins-h3 text-[20px] md:text-[24px]"
                dateTime="16:04"
              >
                4:04PM
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
            aria-labelledby="ongoing-meetings-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="ongoing-meetings-heading"
              className="font-poppins-h3 text-[26px] text-moodboard-2midnight-blue md:text-[32px]"
            >
              Ongoing Meetings
            </h2>

            <article className="rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-4 md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-poppins-h3 text-[22px] leading-tight text-color-scheme-grays-black md:text-[30px]">
                      Data Structures and Algorithms
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[16px] text-color-scheme-grays-black md:text-[20px]">
                      <span className="font-subtext-semibold">
                        Mr. Ronnie D. Luy
                      </span>
                      <span
                        className="hidden h-5 w-px bg-moodboard-1light-gray-ish-blue sm:block"
                        aria-hidden="true"
                      />
                      <time
                        className="font-subtext-semibold"
                        dateTime="16:00/17:30"
                      >
                        4:00PM - 5:30PM
                      </time>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {participantAvatars.map((participant) => (
                      <img
                        key={participant.id}
                        className="h-9 w-9 rounded-full object-cover md:h-10 md:w-10"
                        alt=""
                        aria-hidden="true"
                        src={participant.src}
                      />
                    ))}
                    <span className="font-h5 text-[16px] text-moodboard-2light-purple md:text-[20px]">
                      and 20+
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="self-start rounded-[14px] bg-moodboard-2light-purple px-5 py-3 font-poppins-h3 text-[20px] leading-none text-white transition hover:opacity-90 md:self-auto md:text-[24px]"
                  onClick={() => setIsJoinDialogOpen(true)}
                >
                  JOIN
                </button>
              </div>
            </article>
          </section>
        </main>
      </div>

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

      {isJoinDialogOpen && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/20 p-4"
          role="presentation"
          onClick={() => setIsJoinDialogOpen(false)}
        >
          <section
            className="w-full max-w-[420px] rounded-[18px] border border-solid border-moodboard-1light-gray-ish-blue bg-moodboard-2warm-white p-6 shadow-[0px_4px_4px_#00000040] md:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="join-dialog-title"
              className="font-poppins-h3 text-[24px] text-moodboard-2midnight-blue md:text-[30px]"
            >
              Join meeting
            </h2>
            <p className="mt-3 font-subtext text-[16px] text-moodboard-2dull-blue md:text-[20px]">
              Enter the meeting using your Edu-Meet account.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-[12px] px-4 py-2 font-subtext-semibold text-moodboard-2midnight-blue"
                onClick={() => setIsJoinDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-[12px] bg-moodboard-2light-purple px-4 py-2 font-subtext-semibold text-white"
                onClick={() => setIsJoinDialogOpen(false)}
              >
                Continue
              </button>
            </div>
          </section>
        </div>
      )}

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
