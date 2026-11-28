
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@quiz/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Search,
  AlertCircle,
  Clock3,
  Eye,
  Pencil,
  Send,
  Archive,
  X,
  BarChart3,
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/+$/, "");

function getAuthHeaders() {
  const headers = {};

  try {
    const storedToken = localStorage.getItem("edu_meet_redis_token");

    if (storedToken) {
      headers.Authorization = storedToken.toLowerCase().startsWith("bearer ")
        ? storedToken
        : `Bearer ${storedToken}`;
    }
  } catch {
    // A missing token will be handled by the backend.
  }

  return headers;
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => "");
}

function getApiError(data, fallback) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.error || data?.message || fallback;
}

function getQuestions(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (value && typeof value.value === "string") {
    try {
      const parsed = JSON.parse(value.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeActivity(activity) {
  const rawStatus = String(activity.status || "draft").toLowerCase();

  const status =
    rawStatus === "published"
      ? "Published"
      : rawStatus === "archived"
        ? "Archived"
        : "Draft";

  const questionList = getQuestions(
    activity.question_and_answer ??
      activity.questionAndAnswer ??
      activity.questions
  );

  const hasEssay = questionList.some((question) => {
    const questionType = String(
      question.type ??
        question.questionType ??
        question.question_type ??
        ""
    ).toLowerCase();

    return questionType.includes("essay");
  });

  return {
    id: activity.id ?? activity.activityId,
    title: activity.name || "Untitled Assessment",
    type: String(activity.type || "QUIZ").toUpperCase(),
    course:
      activity.course_name ||
      activity.courseName ||
      "Unspecified Course",
    code: activity.course_code || activity.courseCode || "No course code",
    passingGrade: Number(
      activity.passing_grade_percent ??
        activity.passingGradePercent ??
        0
    ),
    questions: questionList.length,
    hasEssay,
    status,
  };
}

function MetricCard({ title, value, description, icon: Icon, color }) {
  return (
    <div
      className="flex min-h-[104px] items-center justify-between rounded-xl border-2 border-[#273344] bg-white p-4 shadow-[0_3px_0_#8892a0]"
      style={{ borderLeftColor: color }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#252d3b]">
          {title}
        </p>

        <p className="mt-1 text-3xl font-extrabold text-[#172033]">
          {value}
        </p>

        <p className="text-xs" style={{ color }}>
          {description}
        </p>
      </div>

      <Icon
        className="size-10 opacity-25"
        style={{ color }}
        aria-hidden="true"
      />
    </div>
  );
}

function QuizCard({
  quiz,
  onView,
  onEdit,
  onPublish,
  onArchive,
  onGradeEssays,
  onViewScores,
  busy,
}) {
  const statusStyles = {
    Published: "bg-green-100 text-green-700",
    Draft: "bg-amber-100 text-amber-700",
    Archived: "bg-slate-200 text-slate-700",
  };

  return (
    <article className="overflow-hidden rounded-xl border-2 border-[#263244] bg-white shadow-[0_4px_0_#8792a3]">
      <div className="border-b-2 border-[#263244] bg-[#A38AF4] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold text-[#273244]">
            {quiz.course}
          </span>

          <span className="text-[10px] font-semibold text-white">
            {quiz.code}
          </span>
        </div>

        <h3 className="text-base font-extrabold text-[#172033]">
          {quiz.title}
        </h3>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2 text-xs text-[#364152]">
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-4" />
            {quiz.type}
          </span>

          <span className="flex items-center gap-1.5">
            <ClipboardList className="size-4" />
            {quiz.questions} Questions
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#364152]">
          <CheckCircle2 className="size-4" />
          Passing grade: {quiz.passingGrade}%
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[quiz.status]}`}
          >
            {quiz.status}
          </span>

          <span className="text-xs font-semibold text-slate-500">
            ID: {quiz.id}
          </span>
        </div>

        {/* ASSESSMENT MANAGEMENT ACTIONS */}
        <div className="grid grid-cols-2 gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onView(quiz.id)}
          >
            <Eye className="mr-1 size-4" />
            View
          </Button>

          {quiz.status === "Draft" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onEdit(quiz.id)}
            >
              <Pencil className="mr-1 size-4" />
              Edit
            </Button>
          )}

          {quiz.hasEssay && quiz.status !== "Draft" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || typeof onGradeEssays !== "function"}
              onClick={() => onGradeEssays(quiz)}
              className="border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <ClipboardList className="mr-1 size-4" />
              Grade Essays
            </Button>
          )}

          {quiz.status !== "Draft" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || typeof onViewScores !== "function"}
              onClick={() => onViewScores(quiz)}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <BarChart3 className="mr-1 size-4" />
              View Scores
            </Button>
          )}

          {quiz.status === "Draft" && (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onPublish(quiz)}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Send className="mr-1 size-4" />
              Publish
            </Button>
          )}

          {quiz.status !== "Archived" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onArchive(quiz)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Archive className="mr-1 size-4" />
              Archive
            </Button>
          )}
        </div>

        {busy && (
          <p className="text-center text-xs text-slate-500">
            Processing...
          </p>
        )}
      </div>
    </article>
  );
}

function AssessmentDetailsModal({ activity, onClose }) {
  const questions = getQuestions(
    activity.activity.question_and_answer ??
      activity.activity.questionAndAnswer ??
      activity.activity.questions
  );

  const targets = activity.targetClasses || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-details-title"
        className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-3 border-b pb-4">
          <div>
            <h2
              id="assessment-details-title"
              className="text-xl font-extrabold text-slate-900"
            >
              Assessment Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Assessment #{activity.activity.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close assessment details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Assessment Title
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
              {activity.activity.name}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Course
              </p>

              <p className="mt-1 text-sm text-slate-800">
                {activity.activity.course_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Course Code
              </p>

              <p className="mt-1 text-sm text-slate-800">
                {activity.activity.course_code}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Assessment Type
              </p>

              <p className="mt-1 text-sm text-slate-800">
                {activity.activity.type}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Passing Grade
              </p>

              <p className="mt-1 text-sm text-slate-800">
                {activity.activity.passing_grade_percent}%
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Status
              </p>

              <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                {activity.activity.status}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-bold text-slate-900">
              Target Classes
            </h3>

            {targets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {targets.map((classItem, index) => (
                  <span
                    key={classItem.class_id ?? classItem.classId ?? index}
                    className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700"
                  >
                    {classItem.class_name ?? classItem.className} (
                    {classItem.class_code ?? classItem.classCode})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No target classes found.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-bold text-slate-900">
              Questions ({questions.length})
            </h3>

            <div className="space-y-3">
              {questions.map((question, index) => (
                <article
                  key={index}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      Question {index + 1}
                    </p>

                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">
                      {question.type} · {question.points} points
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {question.questionText}
                  </p>

                  {Array.isArray(question.options) &&
                    question.options.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {question.options.map((option, optionIndex) => (
                          <p
                            key={optionIndex}
                            className="text-sm text-slate-600"
                          >
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </p>
                        ))}
                      </div>
                    )}

                  {question.correctAnswer && (
                    <p className="mt-3 text-sm font-semibold text-green-700">
                      Correct answer: {question.correctAnswer}
                    </p>
                  )}

                  {question.acceptedAnswers?.length > 0 && (
                    <p className="mt-2 text-sm text-green-700">
                      Accepted answers: {question.acceptedAnswers.join(", ")}
                    </p>
                  )}
                </article>
              ))}

              {questions.length === 0 && (
                <p className="text-sm text-slate-500">
                  No questions found.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t pt-4">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function FacultyQuizDashboard({
  onCreate,
  onEdit,
  onGradeEssays,
  onViewScores,
}) {
  const [quizzes, setQuizzes] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [activeAction, setActiveAction] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/quizexam/activities`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "401 Unauthorized: Authentication integration is still required."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "403 Forbidden: only authorized Faculty can view these assessments."
          );
        }

        throw new Error(
          getApiError(data, `Unable to load assessments (${response.status}).`)
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "The backend returned an unexpected assessment list."
        );
      }

      setQuizzes(data.map(normalizeActivity));
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not connect to the assessment service."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // GET ONE ASSESSMENT AND ITS TARGET CLASSES
  async function getActivityDetails(activityId) {
    const response = await fetch(
      `${API_BASE_URL}/api/quizexam/activities/${encodeURIComponent(activityId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        getApiError(data, `Unable to retrieve assessment (${response.status}).`)
      );
    }

    if (!data?.activity) {
      throw new Error(
        "The backend did not return the expected assessment details."
      );
    }

    return {
      ...data.activity,
      targetClasses: data.targetClasses || [],
    };
  }

  // VIEW ASSESSMENT DETAILS
  async function handleView(activityId) {
    setActiveAction(activityId);
    setActionError("");
    setActionMessage("");

    try {
      const activity = await getActivityDetails(activityId);

      setSelectedActivity({
        activity,
        targetClasses: activity.targetClasses,
      });
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setActiveAction(null);
    }
  }

  // LOAD EXISTING DRAFT INTO THE BUILDER
  async function handleEdit(activityId) {
    setActiveAction(activityId);
    setActionError("");
    setActionMessage("");

    try {
      const activity = await getActivityDetails(activityId);

      if (String(activity.status).toLowerCase() !== "draft") {
        throw new Error("Only draft assessments can be edited.");
      }

      if (typeof onEdit !== "function") {
        throw new Error("The assessment editing function is not connected.");
      }

      onEdit(activity);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setActiveAction(null);
    }
  }

  // PUBLISH OR ARCHIVE AN ASSESSMENT
  async function handleStatusChange(quiz, newStatus) {
    const actionLabel =
      newStatus === "published" ? "publish" : "archive";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} "${quiz.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(quiz.id);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/quizexam/activities/${encodeURIComponent(quiz.id)}/status`,
        {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiError(
            data,
            `Unable to ${actionLabel} assessment (${response.status}).`
          )
        );
      }

      setActionMessage(
        `"${quiz.title}" was successfully ${
          actionLabel === "publish" ? "published" : "archived"
        }.`
      );

      await fetchActivities();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setActiveAction(null);
    }
  }

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        quiz.title.toLowerCase().includes(searchValue) ||
        quiz.course.toLowerCase().includes(searchValue) ||
        quiz.code.toLowerCase().includes(searchValue);

      const matchesFilter =
        filter === "All" || quiz.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [quizzes, search, filter]);

  const publishedCount = quizzes.filter(
    (quiz) => quiz.status === "Published"
  ).length;

  const draftCount = quizzes.filter(
    (quiz) => quiz.status === "Draft"
  ).length;

  const totalQuestions = quizzes.reduce(
    (total, quiz) => total + quiz.questions,
    0
  );

  return (
    <main className="min-h-screen bg-[#d9d0df] px-4 py-6 text-[#172033] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1350px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#aaa0b4] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-7 text-violet-600" />

              <h1 className="text-2xl font-extrabold tracking-tight">
                QUIZZES
              </h1>
            </div>

            <p className="mt-1 text-sm text-[#465064]">
              Manage, track, and create assessment modules for your courses.
            </p>
          </div>

          <span className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            Faculty Dashboard
          </span>
        </header>

        {/* DASHBOARD METRICS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Assessments"
            value={quizzes.length}
            description="From the database"
            icon={BookOpen}
            color="#9877F0"
          />

          <MetricCard
            title="Published"
            value={publishedCount}
            description="Available to students"
            icon={CheckCircle2}
            color="#27BF80"
          />

          <MetricCard
            title="Draft Pending"
            value={draftCount}
            description="In preparation"
            icon={Clock3}
            color="#16C7C4"
          />

          <MetricCard
            title="Total Questions"
            value={totalQuestions}
            description="Across all assessments"
            icon={ClipboardList}
            color="#3E78DF"
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">
                Your Quizzes & Examinations
              </h2>

              <p className="text-sm text-[#596477]">
                Assessments retrieved from the Edu-Meet backend.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={fetchActivities}
                disabled={loading}
                className="bg-white"
              >
                <RefreshCw className="mr-1 size-4" />
                Refresh
              </Button>

              <Button
                type="button"
                onClick={onCreate}
                className="bg-[#9478ed] text-white hover:bg-[#8063da]"
              >
                Create Quiz / Exam
              </Button>
            </div>
          </div>

          {/* SEARCH AND FILTER */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#afa6b8] bg-white/70 p-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border bg-white px-3">
              <Search className="size-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search assessments, courses, or codes..."
                className="h-10 w-full bg-transparent text-sm outline-none"
                aria-label="Search assessments"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
              aria-label="Filter assessments by status"
            >
              <option value="All">All Activities</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* ACTION FEEDBACK */}
          {actionError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <p>{actionError}</p>
            </div>
          )}

          {actionMessage && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              {actionMessage}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" />

              <div className="flex-1">
                <p className="font-bold">Unable to load assessments</p>
                <p className="mt-1">{error}</p>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchActivities}
                  className="mt-3 bg-white"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* ASSESSMENT CARDS */}
          {loading ? (
            <div className="rounded-xl border border-[#afa6b8] bg-white/70 p-12 text-center">
              <RefreshCw className="mx-auto mb-3 size-7 animate-spin text-violet-600" />
              <p className="font-semibold">Loading assessments...</p>
            </div>
          ) : filteredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onView={handleView}
                  onEdit={handleEdit}
                  onGradeEssays={onGradeEssays}
                  onViewScores={onViewScores}
                  onPublish={(item) =>
                    handleStatusChange(item, "published")
                  }
                  onArchive={(item) =>
                    handleStatusChange(item, "archived")
                  }
                  busy={activeAction === quiz.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-400 bg-white/60 p-12 text-center">
              <BookOpen className="mx-auto mb-3 size-8 text-slate-400" />

              <p className="font-semibold">
                {error
                  ? "Assessments are not available."
                  : "No matching assessments found."}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {error
                  ? "Resolve the connection or authentication issue, then try again."
                  : "Create an assessment or try another search term or filter."}
              </p>
            </div>
          )}
        </section>

        <footer className="border-t border-[#aaa0b4] pt-4 text-center text-xs text-[#667085]">
          Edu-Meet Quiz/Exam Management · Connected Dashboard
        </footer>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedActivity && (
        <AssessmentDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </main>
  );
}
