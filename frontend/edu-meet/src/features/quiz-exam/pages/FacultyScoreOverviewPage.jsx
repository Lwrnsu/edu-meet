import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);

function getAuthHeaders() {
  const headers = {};
  try {
    const token = localStorage.getItem("edu_meet_redis_token");
    if (token) {
      headers.Authorization = token.toLowerCase().startsWith("bearer ")
        ? token
        : `Bearer ${token}`;
    }
  } catch {
    // Authentication failures are reported by the API.
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
  if (typeof data === "string" && data.trim()) return data;
  return data?.error || data?.message || fallback;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      })
    : "—";
}

function formatPercent(value) {
  return value === null || value === undefined || value === ""
    ? "—"
    : `${formatNumber(value)}%`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value) {
  if (!value) return "Unknown";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "graded":
      return "bg-green-100 text-green-700";
    case "pending_essay_review":
      return "bg-amber-100 text-amber-800";
    case "not_graded":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function MetricCard({ label, value, helper, icon: Icon }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
        <span className="rounded-lg bg-violet-50 p-2 text-violet-700">
          <Icon className="size-5" />
        </span>
      </div>
    </article>
  );
}

export default function FacultyScoreOverviewPage({
  activityId,
  activityName = "Assessment",
  onBack,
}) {
  const [scores, setScores] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchScores = useCallback(async () => {
    if (!activityId) {
      setError("A valid assessment ID is required to load its scores.");
      setScores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/quizexam/activities/${encodeURIComponent(activityId)}/scores`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      const data = await readApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "401 Unauthorized: expected in the standalone Group 5 preview until the Authentication System & Roles integration supplies the required authenticated request attributes."
          );
        }
        if (response.status === 403) {
          throw new Error(
            "403 Forbidden: this account cannot view scores for this assessment."
          );
        }
        throw new Error(
          getApiError(data, `Unable to load scores (${response.status}).`)
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("The score endpoint returned an unexpected response.");
      }
      setScores(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to load assessment scores.");
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const submittedScores = useMemo(
    () =>
      scores.filter((item) =>
        ["submitted", "auto_submitted"].includes(
          String(item.submissionStatus || "").toLowerCase()
        )
      ),
    [scores]
  );

  const gradedPercentages = useMemo(
    () =>
      submittedScores
        .filter(
          (item) =>
            item.gradePercent !== null &&
            item.gradePercent !== undefined &&
            item.gradePercent !== ""
        )
        .map((item) => Number(item.gradePercent))
        .filter((value) => Number.isFinite(value)),
    [submittedScores]
  );

  const metrics = useMemo(() => {
    const average =
      gradedPercentages.length > 0
        ? gradedPercentages.reduce((sum, value) => sum + value, 0) /
          gradedPercentages.length
        : null;
    const passed = submittedScores.filter((item) => item.isPassed === true).length;
    const decided = submittedScores.filter(
      (item) => item.isPassed === true || item.isPassed === false
    ).length;
    const pending = submittedScores.filter(
      (item) =>
        String(item.gradingStatus || "").toLowerCase() ===
        "pending_essay_review"
    ).length;

    return {
      total: submittedScores.length,
      average,
      highest:
        gradedPercentages.length > 0 ? Math.max(...gradedPercentages) : null,
      lowest:
        gradedPercentages.length > 0 ? Math.min(...gradedPercentages) : null,
      passRate: decided > 0 ? (passed / decided) * 100 : null,
      pending,
    };
  }, [submittedScores, gradedPercentages]);

  const filteredScores = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return submittedScores;
    return submittedScores.filter((item) => {
      const values = [
        item.studentId,
        item.studentAnswerId,
        item.sessionId,
        item.submissionStatus,
        item.gradingStatus,
        item.gradePercent,
      ];
      return values.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );
    });
  }, [submittedScores, search]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
              aria-label="Back to faculty dashboard"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Faculty · Score Overview
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {activityName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review submitted results and essay-grading progress.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchScores}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Unable to load score overview</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={fetchScores}
                className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 font-semibold hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <section
          aria-label="Assessment score statistics"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <MetricCard
            label="Total Submissions"
            value={loading ? "…" : metrics.total.toLocaleString()}
            helper="Submitted and auto-submitted attempts"
            icon={Users}
          />
          <MetricCard
            label="Average Grade"
            value={loading ? "…" : formatPercent(metrics.average)}
            helper="Based on available grade percentages"
            icon={BarChart3}
          />
          <MetricCard
            label="Highest Grade"
            value={loading ? "…" : formatPercent(metrics.highest)}
            helper="Highest available grade percentage"
            icon={TrendingUp}
          />
          <MetricCard
            label="Lowest Grade"
            value={loading ? "…" : formatPercent(metrics.lowest)}
            helper="Lowest available grade percentage"
            icon={TrendingDown}
          />
          <MetricCard
            label="Pass Rate"
            value={loading ? "…" : formatPercent(metrics.passRate)}
            helper="Among attempts with a pass/fail result"
            icon={Award}
          />
          <MetricCard
            label="Pending Essay Grading"
            value={loading ? "…" : metrics.pending.toLocaleString()}
            helper="Submissions awaiting faculty essay review"
            icon={ClipboardList}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Student Results
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Student names are not provided by the current score response;
                results are identified by student ID.
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student ID or status..."
                aria-label="Search student results"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-600">
              <RefreshCw className="size-5 animate-spin text-violet-600" />
              Loading student results…
            </div>
          ) : filteredScores.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="mx-auto size-9 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                {submittedScores.length === 0
                  ? "No submissions yet"
                  : "No matching results"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {submittedScores.length === 0
                  ? "Submitted assessment attempts will appear here."
                  : "Try a different student ID or search term."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student ID</th>
                    <th className="px-4 py-3 text-right font-semibold">Objective</th>
                    <th className="px-4 py-3 text-right font-semibold">Essay</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">Maximum</th>
                    <th className="px-4 py-3 text-right font-semibold">Grade</th>
                    <th className="px-4 py-3 font-semibold">Result</th>
                    <th className="px-4 py-3 font-semibold">Grading Status</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScores.map((item) => (
                    <tr
                      key={item.studentAnswerId}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        {item.studentId ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                        {formatNumber(item.objectiveScore)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                        {formatNumber(item.essayScore)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatNumber(item.totalScore)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                        {formatNumber(item.maxScore)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatPercent(item.gradePercent)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {item.isPassed === true ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="size-3.5" /> Passed
                          </span>
                        ) : item.isPassed === false ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                            Failed
                          </span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(item.gradingStatus)}`}
                        >
                          {formatStatus(item.gradingStatus)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(item.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Showing {filteredScores.length} of {submittedScores.length} submissions
          </div>
        </section>
      </div>
    </main>
  );
}
