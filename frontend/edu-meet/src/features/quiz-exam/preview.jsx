
import { useState } from "react";
import { createRoot } from "react-dom/client";

import FacultyQuizDashboard from "./pages/FacultyQuizDashboard.jsx";
import FacultyActivityBuilder from "./pages/FacultyActivityBuilder.jsx";
import StudentAssessmentPage from "./pages/StudentAssessmentPage.jsx";
import StudentScoreHistory from "./pages/StudentScoreHistory.jsx";
import FacultyEssayGrading from "./pages/FacultyEssayGradingPage.jsx";

import "./styles/quiz-exam.css";

const ACTIVITIES_API = "/api/quizexam/activities";

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
    // The API will return an authentication error if storage is unavailable.
  }

  return headers;
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text ? { message: text } : null;
}

function getApiError(data, fallback) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.error || data?.message || fallback;
}

function QuizExamPreview() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [pendingDraft, setPendingDraft] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [gradingActivity, setGradingActivity] = useState(null);
  const [studentView, setStudentView] = useState("assessments");

  // CREATE A NEW ASSESSMENT
  async function handleSave(activityData, saveStatus) {
    const fingerprint = JSON.stringify(activityData);
    let activityId = null;

    if (pendingDraft?.fingerprint === fingerprint) {
      activityId = pendingDraft.activityId;

      if (saveStatus === "draft") {
        setPendingDraft(null);
        setCurrentPage("dashboard");
        return;
      }
    } else {
      const createResponse = await fetch(ACTIVITIES_API, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(activityData),
      });

      const createdActivity = await readApiResponse(createResponse);

      if (!createResponse.ok) {
        if (createResponse.status === 401) {
          throw new Error(
            "401 Unauthorized: Redis authentication integration is still required."
          );
        }

        if (createResponse.status === 403) {
          throw new Error(
            "403 Forbidden: this account does not have permission to create assessments."
          );
        }

        throw new Error(
          getApiError(
            createdActivity,
            `Unable to save the assessment (${createResponse.status}).`
          )
        );
      }

      activityId = createdActivity?.activityId;

      if (!activityId) {
        throw new Error(
          "The backend did not return an activity ID after saving the draft."
        );
      }

      if (saveStatus === "published") {
        setPendingDraft({ activityId, fingerprint });
      }
    }

    if (saveStatus === "published") {
      const publishResponse = await fetch(
        `${ACTIVITIES_API}/${encodeURIComponent(activityId)}/status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: "published" }),
        }
      );

      const publishResult = await readApiResponse(publishResponse);

      if (!publishResponse.ok) {
        throw new Error(
          `Assessment #${activityId} was saved as a draft, but publishing failed. Press Publish again to retry without creating a duplicate: ${getApiError(
            publishResult,
            `HTTP ${publishResponse.status}`
          )}`
        );
      }

      setPendingDraft(null);
    }

    setCurrentPage("dashboard");
  }

  // LOAD AN EXISTING DRAFT INTO THE BUILDER
  function handleEdit(activity) {
    setEditingActivity(activity);
    setCurrentPage("builder");
  }

  // UPDATE AN EXISTING DRAFT
  async function handleUpdate(activityData, activityId) {
    if (!activityId) {
      throw new Error("A valid assessment ID is required for editing.");
    }

    const response = await fetch(
      `${ACTIVITIES_API}/${encodeURIComponent(activityId)}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(activityData),
      }
    );

    const result = await readApiResponse(response);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "401 Unauthorized: Redis authentication integration is still required."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "403 Forbidden: you cannot edit this assessment."
        );
      }

      throw new Error(
        getApiError(
          result,
          `Unable to update the assessment (${response.status}).`
        )
      );
    }

    setEditingActivity(null);
    setCurrentPage("dashboard");
  }

  // OPEN ESSAY GRADING
  function handleGradeEssays(activity) {
    setGradingActivity(activity);
    setCurrentPage("essay");
  }

  // RETURN TO THE FACULTY DASHBOARD
  function handleBackToDashboard() {
    setEditingActivity(null);
    setGradingActivity(null);
    setCurrentPage("dashboard");
  }

  // FACULTY BUILDER
  if (currentPage === "builder") {
    return (
      <FacultyActivityBuilder
        initialActivity={editingActivity}
        onBack={handleBackToDashboard}
        onSave={handleSave}
        onUpdate={handleUpdate}
      />
    );
  }

  // FACULTY ESSAY GRADING
  if (currentPage === "essay") {
    const activityId =
      gradingActivity?.activityId ?? gradingActivity?.id;

    const activityName =
      gradingActivity?.activityName ??
      gradingActivity?.name ??
      gradingActivity?.title ??
      "Essay Grading";

    return (
      <FacultyEssayGrading
        activityId={activityId}
        activityName={activityName}
        onBack={handleBackToDashboard}
      />
    );
  }

  // STUDENT PORTAL
  if (currentPage === "student") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 pt-5">
          <h1 className="text-lg font-bold text-slate-900">
            Student Portal
          </h1>

          <button
            type="button"
            onClick={() => setCurrentPage("dashboard")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Faculty Dashboard
          </button>
        </div>

        {/* STUDENT NAVIGATION */}
        <div className="mx-auto flex max-w-5xl gap-2 px-6 pt-6">
          <button
            type="button"
            onClick={() => setStudentView("assessments")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              studentView === "assessments"
                ? "bg-purple-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            My Assessments
          </button>

          <button
            type="button"
            onClick={() => setStudentView("results")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              studentView === "results"
                ? "bg-purple-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            My Results
          </button>
        </div>

        <div className="mx-auto max-w-5xl px-6 pt-4 pb-8">
          {studentView === "assessments" ? (
            <>
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                Development preview only. Student authentication and class
                enrollment integration are still pending. Opening an
                assessment may create or retrieve a student attempt.
              </div>

              <StudentAssessmentPage />
            </>
          ) : (
            <StudentScoreHistory />
          )}
        </div>
      </div>
    );
  }

  // FACULTY DASHBOARD
  return (
    <div>
      <div className="mx-auto flex max-w-6xl justify-end gap-3 px-6 pt-4">
        <button
          type="button"
          onClick={() => {
            setStudentView("assessments");
            setCurrentPage("student");
          }}
          className="rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
        >
          Open Student Preview
        </button>
      </div>

      <FacultyQuizDashboard
        onCreate={() => {
          setEditingActivity(null);
          setCurrentPage("builder");
        }}
        onEdit={handleEdit}
        onGradeEssays={handleGradeEssays}
      />
    </div>
  );
}

const rootElement = document.getElementById("quiz-exam-root");

if (!rootElement) {
  throw new Error(
    'Quiz Exam preview could not start: element with id "quiz-exam-root" was not found.'
  );
}

createRoot(rootElement).render(<QuizExamPreview />);
