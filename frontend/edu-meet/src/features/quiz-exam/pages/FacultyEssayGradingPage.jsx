
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  UserRound,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);

function getAuthorizationHeader() {
  const token = localStorage.getItem("edu_meet_redis_token");

  if (!token) {
    throw new Error("No authentication token found. Please log in again.");
  }

  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

async function readResponse(response) {
  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

function formatStatus(status) {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusStyle(status) {
  const value = String(status || "").toLowerCase();

  if (value === "graded") {
    return "bg-green-100 text-green-700";
  }

  if (value === "pending_essay_review") {
    return "bg-amber-100 text-amber-700";
  }

  if (value === "submitted") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-gray-100 text-gray-600";
}

function buildGradeState(submissions) {
  const result = {};

  submissions.forEach((submission) => {
    result[submission.studentAnswerId] = {};

    (submission.essays || []).forEach((essay) => {
      result[submission.studentAnswerId][essay.questionIndex] = {
        pointsAwarded:
          essay.pointsAwarded === null ||
          essay.pointsAwarded === undefined
            ? ""
            : String(essay.pointsAwarded),
        feedback: essay.feedback || "",
      };
    });
  });

  return result;
}

export default function FacultyEssayGrading({
  activityId,
  activityName,
  onBack,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [gradeValues, setGradeValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scoreResult, setScoreResult] = useState(null);
  const [search, setSearch] = useState("");

  const loadSubmissions = useCallback(async () => {
    if (!activityId) {
      setError("No assessment was selected.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setScoreResult(null);

    try {
      const authorization = getAuthorizationHeader();

      const response = await fetch(
        `${API_BASE_URL}/api/quizexam/activities/${activityId}/essay-submissions`,
        {
          method: "GET",
          headers: {
            Authorization: authorization,
            Accept: "application/json",
          },
        }
      );

      const data = await readResponse(response);
      const rows = Array.isArray(data) ? data : [];

      setSubmissions(rows);
      setGradeValues(buildGradeState(rows));

      setSelectedId((previous) => {
        const stillExists = rows.some(
          (item) => String(item.studentAnswerId) === String(previous)
        );

        return stillExists
          ? previous
          : rows[0]?.studentAnswerId ?? null;
      });
    } catch (err) {
      setError(err.message || "Unable to load essay submissions.");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const selectedSubmission = useMemo(
    () =>
      submissions.find(
        (item) => String(item.studentAnswerId) === String(selectedId)
      ) || null,
    [submissions, selectedId]
  );

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return submissions;

    return submissions.filter((submission) =>
      String(submission.studentId).toLowerCase().includes(query)
    );
  }, [submissions, search]);

  const pendingCount = submissions.filter(
    (item) => item.gradingStatus !== "graded"
  ).length;

  function updateGrade(questionIndex, field, value) {
    if (!selectedSubmission) return;

    const studentAnswerId = selectedSubmission.studentAnswerId;

    setGradeValues((previous) => ({
      ...previous,
      [studentAnswerId]: {
        ...previous[studentAnswerId],
        [questionIndex]: {
          ...previous[studentAnswerId]?.[questionIndex],
          [field]: value,
        },
      },
    }));

    setScoreResult(null);
    setNotice("");
  }

  async function handleSaveGrades() {
    if (!selectedSubmission) return;

    const essays = selectedSubmission.essays || [];

    if (essays.length === 0) {
      setError("This submission has no essay answers to grade.");
      return;
    }

    const grades = [];

    for (const essay of essays) {
      const values =
        gradeValues[selectedSubmission.studentAnswerId]?.[
          essay.questionIndex
        ];

      const rawScore = values?.pointsAwarded;

      if (rawScore === "" || rawScore === undefined || rawScore === null) {
        setError(
          `Please enter a score for Essay Question ${essay.questionIndex + 1}.`
        );
        return;
      }

      const points = Number(rawScore);
      const maximum = Number(essay.maxPoints);

      if (
        !Number.isFinite(points) ||
        points < 0 ||
        !Number.isFinite(maximum) ||
        maximum < 0 ||
        points > maximum
      ) {
        setError(
          `Invalid score for Essay Question ${essay.questionIndex + 1}. The score must be between 0 and ${essay.maxPoints}.`
        );
        return;
      }

      grades.push({
        questionIndex: essay.questionIndex,
        pointsAwarded: points,
        feedback: values.feedback?.trim() || null,
      });
    }

    setSaving(true);
    setError("");
    setNotice("");
    setScoreResult(null);

    try {
      const authorization = getAuthorizationHeader();

      const response = await fetch(
        `${API_BASE_URL}/api/quizexam/student-answers/${selectedSubmission.studentAnswerId}/essay-grades`,
        {
          method: "PUT",
          headers: {
            Authorization: authorization,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ grades }),
        }
      );

      const result = await readResponse(response);

      setScoreResult(result);

      setSubmissions((previous) =>
        previous.map((submission) => {
          if (
            String(submission.studentAnswerId) !==
            String(selectedSubmission.studentAnswerId)
          ) {
            return submission;
          }

          return {
            ...submission,
            gradingStatus: result.gradingStatus || "graded",
            essays: submission.essays.map((essay) => {
              const grade = grades.find(
                (item) => item.questionIndex === essay.questionIndex
              );

              if (!grade) return essay;

              return {
                ...essay,
                pointsAwarded: grade.pointsAwarded,
                feedback: grade.feedback,
                graded: true,
              };
            }),
          };
        })
      );

      setNotice("Essay grades successfully saved.");
    } catch (err) {
      setError(err.message || "Unable to save essay grades.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50"
                aria-label="Back"
              >
                <ArrowLeft size={19} />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ClipboardList size={16} />
                Faculty Assessment Management
              </div>

              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                Essay Grading
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {activityName || "Review and grade student essay submissions"}
              </p>
            </div>
          </div>

          <button
            onClick={loadSubmissions}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total Submissions</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {submissions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Pending Review</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Graded Submissions</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {submissions.length - pendingCount}
            </p>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {notice && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{notice}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <RefreshCw
              size={28}
              className="mx-auto animate-spin text-gray-400"
            />
            <p className="mt-3 text-sm text-gray-500">
              Loading essay submissions...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* SUBMISSION LIST */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 p-4">
                <h2 className="font-semibold text-gray-900">
                  Student Submissions
                </h2>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student ID..."
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="max-h-[650px] overflow-y-auto">
                {filteredSubmissions.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText
                      size={30}
                      className="mx-auto text-gray-300"
                    />
                    <p className="mt-3 text-sm text-gray-500">
                      No submissions found.
                    </p>
                  </div>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <button
                      key={submission.studentAnswerId}
                      onClick={() => {
                        setSelectedId(submission.studentAnswerId);
                        setError("");
                        setNotice("");
                        setScoreResult(null);
                      }}
                      className={`w-full border-b border-gray-100 p-4 text-left transition hover:bg-gray-50 ${
                        String(selectedId) ===
                        String(submission.studentAnswerId)
                          ? "bg-blue-50 border-l-4 border-l-blue-600"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded-xl bg-gray-100 p-2 text-gray-600">
                            <UserRound size={18} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Student #{submission.studentId}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              Submission #{submission.studentAnswerId}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                            submission.gradingStatus
                          )}`}
                        >
                          {formatStatus(submission.gradingStatus)}
                        </span>

                        <span className="text-xs text-gray-500">
                          {(submission.essays || []).length} essay(s)
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* SELECTED STUDENT */}
            <div className="min-w-0 space-y-5">
              {!selectedSubmission ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                  <ClipboardList
                    size={36}
                    className="mx-auto text-gray-300"
                  />
                  <h3 className="mt-3 font-semibold text-gray-800">
                    Select a submission
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a student from the list to review their answers.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">
                          Selected Student
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-gray-900">
                          Student #{selectedSubmission.studentId}
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                          Submission #{selectedSubmission.studentAnswerId}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                          selectedSubmission.gradingStatus
                        )}`}
                      >
                        {formatStatus(selectedSubmission.gradingStatus)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                      <span className="text-xs text-gray-500">
                        Submission status:
                      </span>

                      <span className="text-xs font-medium text-gray-700">
                        {formatStatus(selectedSubmission.submissionStatus)}
                      </span>

                      <span className="mx-2 text-gray-300">|</span>

                      <span className="text-xs text-gray-500">
                        Essay questions:
                      </span>

                      <span className="text-xs font-medium text-gray-700">
                        {(selectedSubmission.essays || []).length}
                      </span>
                    </div>
                  </div>

                  {(selectedSubmission.essays || []).map((essay, index) => {
                    const values =
                      gradeValues[selectedSubmission.studentAnswerId]?.[
                        essay.questionIndex
                      ] || {};

                    return (
                      <div
                        key={essay.questionIndex}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
                          <h3 className="font-semibold text-gray-900">
                            Essay Question {index + 1}
                          </h3>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            Maximum: {essay.maxPoints} points
                          </span>
                        </div>

                        <div className="space-y-5 p-5">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Question
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-800">
                              {essay.questionText}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Student's Answer
                            </p>

                            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                              {essay.studentAnswer || "No answer provided."}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Points Awarded
                              </label>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={essay.maxPoints}
                                  step="0.01"
                                  value={values.pointsAwarded ?? ""}
                                  onChange={(event) =>
                                    updateGrade(
                                      essay.questionIndex,
                                      "pointsAwarded",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Enter score"
                                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />

                                <span className="shrink-0 text-sm text-gray-500">
                                  / {essay.maxPoints}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Feedback
                              </label>

                              <input
                                type="text"
                                value={values.feedback ?? ""}
                                onChange={(event) =>
                                  updateGrade(
                                    essay.questionIndex,
                                    "feedback",
                                    event.target.value
                                  )
                                }
                                placeholder="Write feedback..."
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                          </div>

                          {essay.graded && (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                              <CheckCircle2 size={14} />
                              Previously graded
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(selectedSubmission.essays || []).length > 0 && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Submit Evaluation
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Review all scores before saving this student's
                            essay grades.
                          </p>
                        </div>

                        <button
                          onClick={handleSaveGrades}
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Save size={17} />
                          {saving ? "Saving..." : "Save Grades"}
                        </button>
                      </div>

                      {scoreResult && (
                        <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4">
                          <p className="text-sm font-semibold text-green-800">
                            Updated Student Score
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                              <p className="text-xs text-green-700">
                                Objective
                              </p>
                              <p className="mt-1 font-bold text-green-900">
                                {scoreResult.objectiveScore ?? "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-green-700">
                                Essay
                              </p>
                              <p className="mt-1 font-bold text-green-900">
                                {scoreResult.essayScore ?? "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-green-700">Total</p>
                              <p className="mt-1 font-bold text-green-900">
                                {scoreResult.totalScore ?? "—"} /{" "}
                                {scoreResult.maxScore ?? "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-green-700">
                                Percentage
                              </p>
                              <p className="mt-1 font-bold text-green-900">
                                {scoreResult.gradePercent ?? "—"}%
                              </p>
                            </div>
                          </div>

                          {scoreResult.gradingStatus && (
                            <p className="mt-3 text-xs text-green-800">
                              Grading status:{" "}
                              {formatStatus(scoreResult.gradingStatus)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
