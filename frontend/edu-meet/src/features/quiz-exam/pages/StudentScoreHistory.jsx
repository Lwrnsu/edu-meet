
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertCircle,
} from "lucide-react";

const RESULTS_API = "/api/quizexam/student/results";

function getAuthHeaders() {
  const token = localStorage.getItem("edu_meet_redis_token");

  return {
    Accept: "application/json",
    Authorization: token
      ? token.toLowerCase().startsWith("bearer ")
        ? token
        : `Bearer ${token}`
      : "",
  };
}

function formatScore(value) {
  return value === null || value === undefined
    ? "Pending"
    : Number(value).toFixed(2);
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString();
}

function formatStatus(status) {
  return String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusStyle(status) {
  switch (String(status || "").toLowerCase()) {
    case "graded":
      return "bg-green-100 text-green-700";
    case "pending_essay_review":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function StudentScoreHistory() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(RESULTS_API, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Student authentication is not ready. Redis integration is still pending."
          );
        }

        throw new Error(
          data?.message ||
            data?.error ||
            `Unable to load results (HTTP ${response.status}).`
        );
      }

      setResults(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to retrieve your assessment results."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const gradedCount = results.filter(
    (result) => result.gradingStatus === "graded"
  ).length;

  const pendingCount = results.length - gradedCount;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              My Results
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Review your previous quizzes and examination scores.
          </p>
        </div>

        <button
          type="button"
          onClick={loadResults}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </header>

      {!loading && !error && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Submissions</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {results.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Fully Graded</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {gradedCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Pending Review</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>
        </section>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <RefreshCw className="mx-auto size-7 animate-spin text-purple-600" />
          <p className="mt-3 text-sm text-slate-500">
            Loading your results...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />

            <div>
              <h2 className="font-semibold text-red-800">
                Unable to load results
              </h2>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadResults}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <ClipboardList className="mx-auto size-10 text-slate-300" />

          <h2 className="mt-3 text-lg font-semibold text-slate-800">
            No Results Yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Your submitted quizzes and examination results will appear here.
          </p>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <section className="space-y-4">
          {results.map((result, index) => {
            const graded = result.gradingStatus === "graded";

            return (
              <article
                key={`${result.activityId}-${result.submittedAt || index}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {result.activityName}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {result.courseName} ({result.courseCode})
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {result.activityType}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                      result.gradingStatus
                    )}`}
                  >
                    {formatStatus(result.gradingStatus)}
                  </span>
                </div>

                <div className="my-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-5 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Objective Score
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatScore(result.objectiveScore)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Essay Score
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatScore(result.essayScore)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Total Score
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatScore(result.totalScore)} /{" "}
                      {formatScore(result.maxScore)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Grade Percentage
                    </p>
                    <p className="mt-1 text-lg font-bold text-purple-700">
                      {result.gradePercent == null
                        ? "Pending"
                        : `${formatScore(result.gradePercent)}%`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <p>Submitted: {formatDate(result.submittedAt)}</p>
                    {result.gradedAt && (
                      <p className="mt-1">
                        Graded: {formatDate(result.gradedAt)}
                      </p>
                    )}
                  </div>

                  {graded ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                        result.isPassed === true
                          ? "text-green-700"
                          : result.isPassed === false
                            ? "text-red-700"
                            : "text-slate-600"
                      }`}
                    >
                      {result.isPassed === true ? (
                        <CheckCircle2 size={17} />
                      ) : result.isPassed === false ? (
                        <XCircle size={17} />
                      ) : null}

                      {result.isPassed === true
                        ? "Passed"
                        : result.isPassed === false
                          ? "Failed"
                          : "Result unavailable"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                      <Clock3 size={17} />
                      Awaiting essay review
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
