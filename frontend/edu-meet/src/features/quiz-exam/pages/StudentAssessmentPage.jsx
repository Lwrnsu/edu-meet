import { useCallback, useEffect, useState } from "react";

const STUDENT_API = "/api/quizexam/student";

// GET THE AUTHENTICATION TOKEN
function getAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const storedToken = localStorage.getItem("edu_meet_redis_token");

    if (storedToken) {
      headers.Authorization = storedToken.toLowerCase().startsWith("bearer ")
        ? storedToken
        : `Bearer ${storedToken}`;
    }
  } catch {
    // The backend will handle unavailable authentication.
  }

  return headers;
}

// READ API RESPONSES
async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text ? { message: text } : null;
}

// SEND API REQUESTS
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    const error = new Error(
      data?.error ||
      data?.message ||
      `Request failed with HTTP ${response.status}.`
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// DISPLAY FRIENDLIER ERRORS
function getFriendlyError(error) {
  if (error.status === 401) {
    return "Student authentication is not ready. The Authentication group's Redis integration is still required.";
  }

  if (error.status === 403) {
    return "Your account does not have permission to access student assessments.";
  }

  return error.message || "Something went wrong. Please try again.";
}

// FORMAT QUESTION TYPES
function normalizeQuestionType(type) {
  return String(type || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// FORMAT SCORES
function formatScore(value) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return Number(value).toFixed(2);
}

export default function StudentAssessmentPage() {

  // ASSESSMENT LIST
  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [listError, setListError] = useState("");

  // SELECTED ASSESSMENT
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  // SESSION AND ATTEMPT
  const [activeSession, setActiveSession] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [sessionMessage, setSessionMessage] = useState("");

  // ANSWERS
  const [answers, setAnswers] = useState({});

  // ACTION STATUS
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // FINAL SCORE
  const [score, setScore] = useState(null);

  // LOAD AVAILABLE ASSESSMENTS
  const loadAssessments = useCallback(async () => {
    setLoadingAssessments(true);
    setListError("");

    try {
      const data = await apiRequest(
        `${STUDENT_API}/assessments`
      );

      setAssessments(Array.isArray(data) ? data : []);
    } catch (error) {
      setListError(getFriendlyError(error));
    } finally {
      setLoadingAssessments(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  // CHECK ACTIVE SESSION AND START OR RETRIEVE ATTEMPT
  async function checkSessionAndStartAttempt(activityId) {
    setActiveSession(null);
    setAttemptId(null);
    setSessionMessage("");
    setActionError("");
    setActionMessage("");

    try {
      // CHECK WHETHER THE FACULTY HAS STARTED THE ASSESSMENT
      const session = await apiRequest(
        `${STUDENT_API}/assessments/${activityId}/active-session`
      );

      if (!session?.sessionId) {
        throw new Error(
          "The backend did not return a valid session ID."
        );
      }

      setActiveSession(session);

      // START OR RETRIEVE THE STUDENT'S EXISTING ATTEMPT
      const attempt = await apiRequest(
        `${STUDENT_API}/sessions/${session.sessionId}/attempt`,
        {
          method: "POST",
        }
      );

      setAttemptId(attempt?.attemptId || null);

      setSessionMessage(
        "Your attempt is ready. You may now answer the questions."
      );

    } catch (error) {

      setActiveSession(null);
      setAttemptId(null);

      if (
        error.status === 400 &&
        error.message.toLowerCase().includes(
          "does not currently have an active session"
        )
      ) {
        setSessionMessage(
          "Your instructor has not started this assessment yet. Check again when your instructor begins the session."
        );
      } else {
        setSessionMessage(getFriendlyError(error));
      }
    }
  }

  // OPEN AN ASSESSMENT
  async function openAssessment(activityId) {
    setLoadingAssessment(true);
    setSelectedAssessment(null);
    setScore(null);
    setActiveSession(null);
    setAttemptId(null);
    setAnswers({});
    setSessionMessage("");
    setActionMessage("");
    setActionError("");

    try {
      const assessment = await apiRequest(
        `${STUDENT_API}/assessments/${activityId}`
      );

      setSelectedAssessment(assessment);

      // Prepare empty answers for every question.
      const initialAnswers = {};

      assessment.questions?.forEach((question) => {
        initialAnswers[question.questionIndex] = "";
      });

      setAnswers(initialAnswers);

      // Check whether the assessment has an active session.
      await checkSessionAndStartAttempt(activityId);

    } catch (error) {
      setListError(getFriendlyError(error));
      setSelectedAssessment(null);
    } finally {
      setLoadingAssessment(false);
    }
  }

  // UPDATE AN ANSWER
  function updateAnswer(questionIndex, answer) {
    setAnswers((previous) => ({
      ...previous,
      [questionIndex]: answer,
    }));

    setActionMessage("");
    setActionError("");
  }

  // PREPARE ANSWERS FOR THE BACKEND
  function buildAnswerPayload() {
    return (selectedAssessment?.questions || []).map((question) => ({
      questionIndex: question.questionIndex,
      answer: answers[question.questionIndex] || "",
    }));
  }

  // SAVE ANSWERS WITHOUT SUBMITTING
  async function saveProgress() {
    if (!activeSession || !attemptId || !selectedAssessment) {
      return;
    }

    setSaving(true);
    setActionMessage("");
    setActionError("");

    try {
      await apiRequest(
        `${STUDENT_API}/sessions/${activeSession.sessionId}/answers`,
        {
          method: "PUT",
          body: JSON.stringify({
            answers: buildAnswerPayload(),
          }),
        }
      );

      setActionMessage(
        "Your answers have been saved successfully."
      );

    } catch (error) {
      setActionError(getFriendlyError(error));
    } finally {
      setSaving(false);
    }
  }

  // SUBMIT ANSWERS AND RECEIVE FINAL SCORE
  async function submitAssessment() {
    if (!activeSession || !attemptId || !selectedAssessment) {
      return;
    }

    setSubmitting(true);
    setActionMessage("");
    setActionError("");

    try {
      const result = await apiRequest(
        `${STUDENT_API}/answers/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: activeSession.sessionId,
            answers: buildAnswerPayload(),
          }),
        }
      );

      // The backend returns StudentScoreResponse.
      setScore(result);

      setAttemptId(null);

      setActionMessage(
        "Your assessment has been submitted successfully."
      );

    } catch (error) {
      setActionError(getFriendlyError(error));
    } finally {
      setSubmitting(false);
    }
  }

  // RETURN TO THE ASSESSMENT LIST
  function backToAssessments() {
    setSelectedAssessment(null);
    setActiveSession(null);
    setAttemptId(null);
    setAnswers({});
    setScore(null);
    setSessionMessage("");
    setActionMessage("");
    setActionError("");
  }

  // QUESTION DISPLAY
  function renderQuestion(question, index) {

    const questionIndex = question.questionIndex;
    const questionType = normalizeQuestionType(question.type);
    const currentAnswer = answers[questionIndex] || "";

    const disabled =
      !attemptId ||
      submitting ||
      score !== null;

    return (
      <section
        key={questionIndex}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between gap-3">

          <h3 className="font-semibold text-slate-900">
            Question {index + 1}
          </h3>

          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
            {question.points} points
          </span>

        </div>

        <p className="mb-5 whitespace-pre-wrap text-slate-800">
          {question.questionText}
        </p>

        {/* MULTIPLE CHOICE AND TRUE OR FALSE */}
        {(
          questionType === "MULTIPLE_CHOICE" ||
          questionType === "TRUE_FALSE"
        ) && (

          <div className="space-y-3">

            {(question.options || []).map((option, optionIndex) => (

              <label
                key={optionIndex}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  currentAnswer === option
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:bg-slate-50"
                } ${
                  disabled
                    ? "cursor-not-allowed opacity-70"
                    : ""
                }`}
              >

                <input
                  type="radio"
                  name={`question-${questionIndex}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={() =>
                    updateAnswer(questionIndex, option)
                  }
                  disabled={disabled}
                  className="h-4 w-4 accent-purple-600"
                />

                <span className="text-sm text-slate-800">
                  {option}
                </span>

              </label>

            ))}

          </div>
        )}

        {/* IDENTIFICATION */}
        {questionType === "IDENTIFICATION" && (

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Your Answer
            </label>

            <input
              type="text"
              value={currentAnswer}
              onChange={(event) =>
                updateAnswer(questionIndex, event.target.value)
              }
              disabled={disabled}
              placeholder="Enter your answer..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
            />

          </div>
        )}

        {/* ESSAY */}
        {questionType === "ESSAY" && (

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Your Essay Response
            </label>

            <textarea
              rows={6}
              value={currentAnswer}
              onChange={(event) =>
                updateAnswer(questionIndex, event.target.value)
              }
              disabled={disabled}
              placeholder="Write your answer here..."
              className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs text-slate-500">
              This question will be manually graded by your instructor.
            </p>

          </div>
        )}

      </section>
    );
  }

  // FINAL SCORE SCREEN
  if (score) {
    return (

      <main className="mx-auto max-w-4xl space-y-6 p-6">

        <header>
          <h1 className="text-2xl font-bold text-slate-900">
            Assessment Submitted
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {score.activityName}
          </p>
        </header>

        <section className="rounded-xl border border-green-200 bg-green-50 p-6">

          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3 text-green-700">
              ✓
            </div>

            <div>
              <h2 className="text-lg font-bold text-green-900">
                Submission Successful
              </h2>

              <p className="text-sm text-green-700">
                Your answers have been recorded.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-slate-500">
                Objective Score
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatScore(score.objectiveScore)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-slate-500">
                Essay Score
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatScore(score.essayScore)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-slate-500">
                Total Score
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatScore(score.totalScore)} / {formatScore(score.maxScore)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-slate-500">
                Grade Percentage
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {score.gradePercent === null ||
                score.gradePercent === undefined
                  ? "Pending"
                  : `${formatScore(score.gradePercent)}%`}
              </p>
            </div>

          </div>

          <div className="mt-5 rounded-lg bg-white p-4">

            <p className="text-sm font-medium text-slate-700">
              Grading Status
            </p>

            <p className="mt-1 font-semibold text-purple-700">
              {score.gradingStatus === "pending_essay_review"
                ? "Pending Faculty Essay Review"
                : "Graded"}
            </p>

            {score.gradingStatus === "pending_essay_review" && (
              <p className="mt-2 text-sm text-slate-600">
                Your objective questions have been scored.
                Your final grade will be available after your
                instructor reviews your essay responses.
              </p>
            )}

            {score.gradingStatus === "graded" && (
              <p className="mt-2 text-sm text-slate-600">
                Final result:{" "}
                {score.isPassed === true
                  ? "Passed"
                  : score.isPassed === false
                    ? "Failed"
                    : "Not available"}
              </p>
            )}

          </div>

        </section>

        <button
          type="button"
          onClick={backToAssessments}
          className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Back to Assessments
        </button>

      </main>

    );
  }

  // SELECTED ASSESSMENT SCREEN
  if (selectedAssessment) {

    return (

      <main className="mx-auto max-w-4xl space-y-6 p-6">

        <button
          type="button"
          onClick={backToAssessments}
          className="text-sm font-medium text-purple-700 hover:underline"
        >
          ← Back to Assessments
        </button>

        <header className="rounded-xl border border-slate-200 bg-white p-6">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {selectedAssessment.name}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {selectedAssessment.courseName} (
                {selectedAssessment.courseCode})
              </p>
            </div>

            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              {selectedAssessment.type}
            </span>

          </div>

          <p className="mt-3 text-sm text-slate-600">
            {selectedAssessment.questions?.length || 0} questions
          </p>

        </header>

        {/* SESSION STATUS */}
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">

          <h2 className="font-semibold text-blue-900">
            Assessment Session
          </h2>

          <p className="mt-1 text-sm text-blue-800">
            {sessionMessage}
          </p>

          {!attemptId && !loadingAssessment && (

            <button
              type="button"
              onClick={() =>
                checkSessionAndStartAttempt(selectedAssessment.id)
              }
              className="mt-3 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
            >
              Check Session Again
            </button>

          )}

        </section>

        {/* QUESTIONS */}
        <div className="space-y-4">

          {selectedAssessment.questions?.map((question, index) =>
            renderQuestion(question, index)
          )}

          {(!selectedAssessment.questions ||
            selectedAssessment.questions.length === 0) && (

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              This assessment contains no questions.
            </div>

          )}

        </div>

        {/* ACTION MESSAGES */}
        {actionMessage && (

          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {actionMessage}
          </div>

        )}

        {actionError && (

          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </div>

        )}

        {/* STUDENT ACTIONS */}
        <section className="flex flex-wrap justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4">

          <button
            type="button"
            onClick={saveProgress}
            disabled={!attemptId || saving || submitting}
            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Answers"}
          </button>

          <button
            type="button"
            onClick={submitAssessment}
            disabled={
              !attemptId ||
              submitting ||
              saving ||
              selectedAssessment.questions?.length === 0
            }
            className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </button>

        </section>

      </main>

    );
  }

  // ASSESSMENT LIST SCREEN
  return (

    <main className="mx-auto max-w-5xl space-y-6 p-6">

      <header className="flex flex-wrap items-center justify-between gap-3">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Assessments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View quizzes and examinations assigned to your classes.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAssessments}
          disabled={loadingAssessments}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingAssessments ? "Refreshing..." : "Refresh"}
        </button>

      </header>

      {loadingAssessments && (

        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Loading your assessments...
        </div>

      )}

      {listError && (

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">

          <h2 className="font-semibold text-red-800">
            Unable to load assessments
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {listError}
          </p>

          <button
            type="button"
            onClick={loadAssessments}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try Again
          </button>

        </div>

      )}

      {!loadingAssessments &&
        !listError &&
        assessments.length === 0 && (

        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">

          <h2 className="text-lg font-semibold text-slate-800">
            No Assessments Available
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There are currently no published assessments assigned
            to your enrolled classes.
          </p>

        </div>

      )}

      {!loadingAssessments &&
        !listError &&
        assessments.length > 0 && (

        <div className="grid gap-4 md:grid-cols-2">

          {assessments.map((assessment) => (

            <article
              key={assessment.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              <div className="flex items-start justify-between gap-3">

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {assessment.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {assessment.courseName}
                  </p>

                  <p className="text-xs text-slate-400">
                    {assessment.courseCode}
                  </p>
                </div>

                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                  {assessment.type}
                </span>

              </div>

              <div className="mt-5 flex items-center justify-between">

                <span className="text-sm text-slate-500">
                  {assessment.questions?.length || 0} questions
                </span>

                <button
                  type="button"
                  onClick={() => openAssessment(assessment.id)}
                  disabled={loadingAssessment}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {loadingAssessment ? "Loading..." : "Open Assessment"}
                </button>

              </div>

            </article>

          ))}

        </div>

      )}

    </main>

  );
}