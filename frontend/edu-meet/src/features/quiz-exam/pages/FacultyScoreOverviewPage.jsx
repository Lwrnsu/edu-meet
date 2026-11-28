import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);
const PAGE_SIZE = 6;
const RING_RADIUS = 70;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
    // The protected API reports authentication failures when storage is unavailable.
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

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, digits = 2) {
  const number = toFiniteNumber(value);
  if (number === null) return "—";

  return number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value) {
  const number = toFiniteNumber(value);
  return number === null ? "—" : `${formatNumber(number)}%`;
}

function formatScorePair(score, maximum) {
  const safeScore = toFiniteNumber(score);
  const safeMaximum = toFiniteNumber(maximum);
  if (safeScore === null || safeMaximum === null) return "—";
  return `${formatNumber(safeScore)} / ${formatNumber(safeMaximum)}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const datePart = date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timePart = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${datePart} ${timePart}`;
}

function formatStatus(value) {
  if (!value) return "Unknown";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isValidActivityId(value) {
  return /^[1-9]\d*$/.test(String(value ?? "").trim());
}

function getGradingBadgeClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "graded":
      return "border-[#8fe0b8] bg-[#e6f5ee] text-[#159957]";
    case "pending_essay_review":
      return "border-[#f0cf82] bg-[#fff5dc] text-[#9a6700]";
    case "not_graded":
      return "border-[#d7d2dc] bg-[#f1eef3] text-[#596273]";
    default:
      return "border-[#c8bafa] bg-[#f0ebff] text-[#6546c4]";
  }
}

function ResultBadge({ passed }) {
  if (passed === true) {
    return (
      <span className="inline-flex min-w-[82px] items-center justify-center gap-1.5 rounded-lg border border-[#45cf91] bg-[#e6f5ee] px-3 py-1 text-sm font-medium text-[#20ad70]">
        <Check className="size-3.5" />
        Passed
      </span>
    );
  }

  if (passed === false) {
    return (
      <span className="inline-flex min-w-[82px] items-center justify-center rounded-lg border border-[#ef7777] bg-[#fff0f0] px-3 py-1 text-sm font-medium text-[#d92f37]">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[82px] items-center justify-center rounded-lg border border-[#d7bd78] bg-[#fff7df] px-3 py-1 text-sm font-medium text-[#916b16]">
      Awaiting result
    </span>
  );
}

function AverageRing({ averagePercent, averageScore, averageMaximum }) {
  const progress = Math.min(100, Math.max(0, averagePercent ?? 0));
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100);
  const hasAverageScore = averageScore !== null && averageMaximum !== null;

  return (
    <div className="relative grid size-[156px] shrink-0 place-items-center sm:size-[184px]">
      <svg
        viewBox="0 0 160 160"
        className="absolute inset-0 size-full -rotate-90"
        role="img"
        aria-label={
          averagePercent === null
            ? "No graded submissions yet"
            : `Average grade ${formatPercent(averagePercent)}`
        }
      >
        <circle
          cx="80"
          cy="80"
          r="77"
          fill="none"
          stroke="#e9e4eb"
          strokeWidth="2.5"
        />
        <circle
          cx="80"
          cy="80"
          r={RING_RADIUS}
          fill="none"
          stroke="#e4dfe7"
          strokeWidth="9"
        />
        {averagePercent !== null && (
          <circle
            cx="80"
            cy="80"
            r={RING_RADIUS}
            fill="none"
            stroke="#9c83f6"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500"
          />
        )}
        <circle
          cx="80"
          cy="80"
          r="59"
          fill="none"
          stroke="#ece7ee"
          strokeWidth="1.5"
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center text-center">
        <p className="text-[23px] font-bold leading-none tracking-tight text-[#172033] sm:text-[27px]">
          {hasAverageScore ? (
            <>
              <span className="text-[#20c879]">{formatNumber(averageScore, 1)}</span>
              <span className="text-[#172033]">/{formatNumber(averageMaximum, 1)}</span>
            </>
          ) : (
            <span className="text-[#7b7381]">—</span>
          )}
        </p>
        <p className="mt-1 text-base font-bold leading-tight text-[#00bfae] sm:text-lg">
          {averagePercent === null ? "No grades yet" : `${formatNumber(averagePercent)}% Avg`}
        </p>
      </div>
    </div>
  );
}

function ScoreSummaryCard({ metrics }) {
  return (
    <article className="relative flex min-h-[212px] items-center gap-3 overflow-hidden rounded-[18px] border-2 border-[#172033] border-l-[8px] border-l-[#9c83f6] bg-[#fffdf8] px-3 py-3 shadow-[0_4px_0_#a49baa] sm:gap-5 sm:px-5 sm:py-3">
      <AverageRing
        averagePercent={metrics.averageGradePercent}
        averageScore={metrics.averageScore}
        averageMaximum={metrics.averageMaximum}
      />

      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold leading-tight text-[#111827] sm:text-[23px]">
          Overall Success Rate
        </h2>
        <p className="mt-1 text-2xl font-extrabold leading-tight text-[#20c879] sm:text-[27px]">
          {formatPercent(metrics.passRate)}
        </p>

        <div className="mt-2 grid grid-cols-2 gap-4 sm:gap-7">
          <div>
            <p className="text-base font-bold text-[#111827] sm:text-lg">Highest</p>
            <p className="text-lg font-bold leading-tight text-[#20c879] sm:text-xl">
              {formatScorePair(
                metrics.highestRecord?.totalScore,
                metrics.highestRecord?.maxScore
              )}
            </p>
            {metrics.highestRecord && (
              <p className="mt-0.5 text-xs font-medium text-[#667085]">
                {formatPercent(metrics.highestRecord.gradePercent)}
              </p>
            )}
          </div>
          <div>
            <p className="text-base font-bold text-[#111827] sm:text-lg">Lowest</p>
            <p className="text-lg font-bold leading-tight text-[#d92f37] sm:text-xl">
              {formatScorePair(
                metrics.lowestRecord?.totalScore,
                metrics.lowestRecord?.maxScore
              )}
            </p>
            {metrics.lowestRecord && (
              <p className="mt-0.5 text-xs font-medium text-[#667085]">
                {formatPercent(metrics.lowestRecord.gradePercent)}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatisticCard({
  title,
  value,
  helper,
  accent,
  watermark: Watermark,
  secondary,
}) {
  return (
    <article
      className="relative flex min-h-[212px] flex-col justify-between overflow-hidden rounded-[18px] border-2 border-[#172033] bg-[#fffdf8] px-4 py-4 shadow-[0_4px_0_#a49baa] sm:px-5 sm:py-4"
      style={{ borderLeftWidth: 8, borderLeftColor: accent }}
    >
      <Watermark
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -right-4 size-[116px] text-[#d8d8d7] opacity-90 sm:size-[136px]"
        strokeWidth={1.7}
      />
      <h2 className="relative z-10 text-lg font-bold text-[#111827] sm:text-[23px]">
        {title}
      </h2>
      <div className="relative z-10">
        <p className="text-5xl font-extrabold leading-none tracking-tight sm:text-[76px]" style={{ color: accent }}>
          {value}
        </p>
        <p className="mt-1 text-sm font-medium text-[#465064] sm:text-[18px]">
          {helper}
        </p>
        {secondary && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a6717] sm:text-sm">
            <Clock3 className="size-3.5" />
            {secondary}
          </p>
        )}
      </div>
    </article>
  );
}

function ExpandedScoreDetails({ item }) {
  const details = [
    ["Objective score", formatNumber(item.objectiveScore)],
    ["Essay score", formatNumber(item.essayScore)],
    ["Maximum score", formatNumber(item.maxScore)],
    ["Submission status", formatStatus(item.submissionStatus)],
    ["Session ID", item.sessionId ?? "—"],
    ["Graded at", formatDate(item.gradedAt)],
  ];

  return (
    <div className="grid gap-3 rounded-xl border border-[#e1dbe5] bg-[#f7f3f8] p-3 sm:grid-cols-2 lg:grid-cols-3">
      {details.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6570]">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-[#172033]">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function FacultyScoreOverviewPage({
  activityId,
  activityName = "Assessment",
  courseName = "",
  courseCode = "",
  onBack,
}) {
  const [scores, setScores] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");

  const fetchScores = useCallback(async () => {
    if (!isValidActivityId(activityId)) {
      setScores([]);
      setErrorType("validation");
      setError(
        "Enter a real, positive numeric assessment ID in the preview URL. The placeholder text is not an assessment ID."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setErrorType("");

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
          throw Object.assign(
            new Error(
              "401 Unauthorized: expected in the standalone Group 5 preview until the Authentication System & Roles integration supplies the required authenticated request attributes."
            ),
            { status: 401 }
          );
        }
        if (response.status === 403) {
          throw Object.assign(
            new Error(
              "403 Forbidden: the authenticated faculty account is not permitted to view this assessment's scores."
            ),
            { status: 403 }
          );
        }
        if (response.status === 404) {
          throw Object.assign(
            new Error(
              "404 Not Found: no assessment was found for this ID. Check the ID against the activities table."
            ),
            { status: 404 }
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
      setExpandedRows(new Set());
      setCurrentPage(1);
    } catch (requestError) {
      setError(requestError.message || "Unable to load assessment scores.");
      setErrorType(
        requestError.status === 401
          ? "auth"
          : requestError.status === 403
            ? "forbidden"
            : requestError.status === 404
              ? "not-found"
              : "error"
      );
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

  const metrics = useMemo(() => {
    const rowsWithGrades = submittedScores
      .map((item) => ({ ...item, numericGrade: toFiniteNumber(item.gradePercent) }))
      .filter((item) => item.numericGrade !== null);

    const rowsWithScores = submittedScores.filter(
      (item) =>
        toFiniteNumber(item.totalScore) !== null &&
        toFiniteNumber(item.maxScore) !== null
    );

    const averageGradePercent =
      rowsWithGrades.length > 0
        ? rowsWithGrades.reduce((sum, item) => sum + item.numericGrade, 0) /
          rowsWithGrades.length
        : null;

    const averageScore =
      rowsWithScores.length > 0
        ? rowsWithScores.reduce(
            (sum, item) => sum + Number(item.totalScore),
            0
          ) / rowsWithScores.length
        : null;

    const averageMaximum =
      rowsWithScores.length > 0
        ? rowsWithScores.reduce(
            (sum, item) => sum + Number(item.maxScore),
            0
          ) / rowsWithScores.length
        : null;

    const highestRecord = rowsWithGrades.reduce(
      (highest, item) =>
        !highest || item.numericGrade > highest.numericGrade ? item : highest,
      null
    );
    const lowestRecord = rowsWithGrades.reduce(
      (lowest, item) =>
        !lowest || item.numericGrade < lowest.numericGrade ? item : lowest,
      null
    );

    const passingStudents = submittedScores.filter(
      (item) => item.isPassed === true
    ).length;
    const decidedResults = submittedScores.filter(
      (item) => item.isPassed === true || item.isPassed === false
    ).length;
    const pendingEssayGrading = submittedScores.filter(
      (item) =>
        String(item.gradingStatus || "").toLowerCase() ===
        "pending_essay_review"
    ).length;

    return {
      totalSubmissions: submittedScores.length,
      averageGradePercent,
      averageScore,
      averageMaximum,
      highestRecord,
      lowestRecord,
      passingStudents,
      passRate:
        decidedResults > 0 ? (passingStudents / decidedResults) * 100 : null,
      pendingEssayGrading,
      decidedResults,
    };
  }, [submittedScores]);

  const filteredScores = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submittedScores.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.studentId,
          item.studentAnswerId,
          item.sessionId,
          item.submissionStatus,
          item.gradingStatus,
          item.gradePercent,
          item.isPassed === true
            ? "passed"
            : item.isPassed === false
              ? "failed"
              : "awaiting result",
          formatDate(item.submittedAt),
        ].some((value) => String(value ?? "").toLowerCase().includes(query));

      const gradingStatus = String(item.gradingStatus || "").toLowerCase();
      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "passed" && item.isPassed === true) ||
        (statusFilter === "failed" && item.isPassed === false) ||
        (statusFilter === "awaiting" &&
          item.isPassed !== true &&
          item.isPassed !== false) ||
        (statusFilter === "essay" &&
          gradingStatus === "pending_essay_review") ||
        (statusFilter === "graded" && gradingStatus === "graded") ||
        (statusFilter === "not_graded" && gradingStatus === "not_graded");

      return matchesSearch && matchesFilter;
    });
  }, [submittedScores, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredScores.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageScores = filteredScores.slice(pageStart, pageStart + PAGE_SIZE);
  const firstVisibleResult = filteredScores.length === 0 ? 0 : pageStart + 1;
  const lastVisibleResult = Math.min(pageStart + PAGE_SIZE, filteredScores.length);

  function toggleExpandedRow(rowKey) {
    setExpandedRows((previous) => {
      const next = new Set(previous);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }

  function changeSearch(value) {
    setSearch(value);
    setCurrentPage(1);
  }

  function changeStatusFilter(value) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  const pageNumbers = Array.from(
    { length: Math.min(totalPages, 3) },
    (_, index) => {
      const start = Math.min(Math.max(currentPage - 1, 1), Math.max(totalPages - 2, 1));
      return start + index;
    }
  );

  const hasValidAssessmentId = isValidActivityId(activityId);
  const metricsUnavailable = loading || Boolean(error) || !hasValidAssessmentId;
  const submissionsCardValue = loading
    ? "…"
    : metricsUnavailable
      ? "—"
      : metrics.totalSubmissions.toLocaleString();
  const submissionsCardHelper = metricsUnavailable
    ? "Waiting for score data"
    : "Submitted attempts";
  const submissionsCardSecondary = metricsUnavailable
    ? "Pending count unavailable"
    : `${metrics.pendingEssayGrading.toLocaleString()} pending essay grading`;
  const passingCardValue = loading
    ? "…"
    : metricsUnavailable
      ? "—"
      : metrics.passingStudents.toLocaleString();
  const passingCardHelper = metricsUnavailable
    ? "Waiting for score data"
    : "Met or exceeded threshold";
  const heading =
    (typeof courseName === "string" ? courseName.trim() : "") ||
    "ASSESSMENT SCORES";
  const subtitle = hasValidAssessmentId
    ? activityName || "Assessment"
    : "Enter a valid assessment ID to view scores";

  return (
    <main className="min-h-screen w-full bg-[#d9d0de] px-4 py-5 text-[#172033] sm:px-7 lg:px-9 xl:px-12">
      <div className="mx-auto w-full max-w-[1920px]">
        <header className="flex items-center gap-4 border-b border-[#99909d] pb-3">
          <div className="relative grid size-12 shrink-0 place-items-center text-[#9c83f6] sm:size-14">
            <BookOpen className="size-10 stroke-[2.2] sm:size-12" />
            <span className="absolute -right-0.5 -top-0.5 grid size-7 place-items-center rounded-md border border-[#7654d8] bg-[#a884fa] text-lg font-extrabold text-white shadow-sm sm:size-8">
              ?
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-none tracking-tight text-[#111827] sm:text-3xl">
              QUIZZES
            </h1>
            <p className="mt-1 text-sm leading-tight text-[#465064] sm:text-xl">
              Manage, track, and create assessment modules for your courses
            </p>
          </div>
        </header>

        <section className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-lg font-bold text-[#3d4757] sm:text-[21px]">
            <button
              type="button"
              onClick={onBack}
              className="rounded-sm text-left transition-colors hover:text-[#7654d8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7654d8]"
            >
              Manage
            </button>
            <span aria-hidden="true">&gt;</span>
            <span>Scores</span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-3xl font-extrabold uppercase leading-[1.04] tracking-tight text-[#111827] sm:text-4xl lg:text-[46px]">
                {heading}
              </h2>
              <p className="mt-0.5 break-words text-2xl font-extrabold leading-[1.05] text-[#111827] sm:text-3xl">
                {subtitle}
              </p>
              {courseCode && (
                <p className="mt-1 text-xs font-semibold tracking-wide text-[#5d5664]">
                  {courseCode}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={fetchScores}
              disabled={loading}
              className="mb-1 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#817987] bg-[#fffdf8] px-4 text-sm font-semibold text-[#172033] shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </section>

        <section
          aria-label="Assessment score summary"
          className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1.72fr_0.98fr_1.06fr] xl:gap-6"
        >
          <ScoreSummaryCard metrics={metrics} />
          <StatisticCard
            title="Total Submissions"
            value={submissionsCardValue}
            helper={submissionsCardHelper}
            secondary={submissionsCardSecondary}
            accent="#2dcc7c"
            watermark={FileText}
          />
          <StatisticCard
            title="Passing Students"
            value={passingCardValue}
            helper={passingCardHelper}
            accent="#0be3cb"
            watermark={CheckCircle2}
          />
        </section>

        <section className="mt-5 rounded-[18px] border-2 border-[#172033] bg-[#fffdf8] p-3 shadow-[0_4px_0_#a49baa] sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex h-12 w-full max-w-[510px] items-center gap-3 rounded-xl border border-[#8e8791] bg-[#fffdf8] px-4 text-[#111827] focus-within:border-[#8d70ed] focus-within:ring-2 focus-within:ring-[#d8cdfd]">
              <Search className="size-5 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Search by student ID or status..."
                aria-label="Search student results by ID or status"
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6b6570]"
              />
            </label>

            <label className="relative flex h-12 min-w-[150px] items-center gap-3 rounded-xl border border-[#8e8791] bg-[#fffdf8] px-4 text-sm text-[#111827] focus-within:border-[#8d70ed] focus-within:ring-2 focus-within:ring-[#d8cdfd]">
              <span>Filter</span>
              <SlidersHorizontal className="size-4 shrink-0" />
              <select
                value={statusFilter}
                onChange={(event) => changeStatusFilter(event.target.value)}
                aria-label="Filter student results"
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="all">All results</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="awaiting">Awaiting result</option>
                <option value="essay">Essay grading pending</option>
                <option value="graded">Graded</option>
                <option value="not_graded">Not graded</option>
              </select>
              <span className="sr-only">
                {statusFilter === "all" ? "All results" : formatStatus(statusFilter)}
              </span>
              <ChevronDown className="size-4" />
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#303846]">
            <table className="w-full min-w-[940px] border-collapse text-left text-[15px]">
              <thead className="bg-[#9c83f6] text-white">
                <tr>
                  <th scope="col" className="px-3 py-[21px] text-center text-[15px] font-bold sm:px-5">
                    Student ID
                  </th>
                  <th scope="col" className="px-3 py-[21px] text-center text-[15px] font-bold sm:px-5">
                    Submitted time
                  </th>
                  <th scope="col" className="px-3 py-[21px] text-center text-[15px] font-bold sm:px-5">
                    Score
                  </th>
                  <th scope="col" className="px-3 py-[21px] text-center text-[15px] font-bold sm:px-5">
                    Grade
                  </th>
                  <th scope="col" className="px-3 py-[21px] text-center text-[15px] font-bold sm:px-5">
                    Result
                  </th>
                  <th scope="col" className="px-3 py-[21px] text-center text-[15px] font-bold sm:px-5">
                    Grading status
                  </th>
                  <th scope="col" className="w-12 px-2 py-[21px]">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4dfe3] bg-[#fffdf8]">
                {error ? (
                  <tr>
                    <td colSpan={7} className="p-3">
                      <div
                        role="alert"
                        className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border px-5 py-8 text-center ${
                          errorType === "validation" || errorType === "auth"
                            ? "border-[#e8cf8d] bg-[#fff8e8]"
                            : "border-[#e7a2a2] bg-[#fff1f1]"
                        }`}
                      >
                        <span
                          className={`grid size-11 place-items-center rounded-full border-2 ${
                            errorType === "validation" || errorType === "auth"
                              ? "border-[#a77b20] text-[#a77b20]"
                              : "border-[#b52c32] text-[#b52c32]"
                          }`}
                        >
                          <AlertCircle className="size-6" />
                        </span>
                        <h3
                          className={`mt-3 text-base font-bold ${
                            errorType === "validation" || errorType === "auth"
                              ? "text-[#805d16]"
                              : "text-[#b4232b]"
                          }`}
                        >
                          {errorType === "validation"
                            ? "Assessment ID needed"
                            : errorType === "auth"
                              ? "Authentication integration pending"
                              : errorType === "forbidden"
                                ? "Access denied"
                                : errorType === "not-found"
                                  ? "Assessment not found"
                                  : "Unable to load student results"}
                        </h3>
                        <p
                          className={`mt-1 max-w-2xl text-sm leading-relaxed ${
                            errorType === "validation" || errorType === "auth"
                              ? "text-[#805d16]"
                              : "text-[#a53338]"
                          }`}
                        >
                          {error}
                        </p>
                        <button
                          type="button"
                          onClick={fetchScores}
                          disabled={loading || !isValidActivityId(activityId)}
                          className={`mt-4 rounded-lg border bg-[#fffdf8] px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            errorType === "validation" || errorType === "auth"
                              ? "border-[#c6a958] text-[#805d16] hover:bg-[#fffdf4]"
                              : "border-[#c8484d] text-[#b4232b] hover:bg-[#fff7f7]"
                          }`}
                        >
                          Try again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={7} className="h-[245px] px-5 text-center">
                      <span className="inline-flex items-center justify-center gap-3 text-sm font-medium text-[#4b5563]">
                        <RefreshCw className="size-5 animate-spin text-[#8d70ed]" />
                        Loading student results…
                      </span>
                    </td>
                  </tr>
                ) : filteredScores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-3">
                      <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-8 text-center">
                        <FileText className="size-10 text-[#a69baa]" />
                        <h3 className="mt-3 text-base font-bold text-[#293243]">
                          {submittedScores.length === 0
                            ? "No submissions yet"
                            : "No matching results"}
                        </h3>
                        <p className="mt-1 max-w-lg text-sm text-[#647084]">
                          {submittedScores.length === 0
                            ? "Submitted and auto-submitted attempts will appear here when students complete this assessment."
                            : "Try another student ID or change the selected filter."}
                        </p>
                        {submittedScores.length > 0 && (search || statusFilter !== "all") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("all");
                              setCurrentPage(1);
                            }}
                            className="mt-3 text-sm font-semibold text-[#7654d8] underline-offset-4 hover:underline"
                          >
                            Clear search and filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageScores.map((item, index) => {
                    const rowKey =
                      item.studentAnswerId ?? `${item.sessionId}-${item.studentId}-${index}`;
                    const isExpanded = expandedRows.has(rowKey);

                    return (
                      <Fragment key={rowKey}>
                        <tr className="text-[#202938] transition-colors hover:bg-[#faf6fc]">
                          <td className="whitespace-nowrap px-3 py-[18px] text-center font-medium tabular-nums sm:px-5">
                            {item.studentId ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-[18px] text-center tabular-nums sm:px-5">
                            {formatDate(item.submittedAt)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-[18px] text-center font-medium tabular-nums sm:px-5">
                            {formatScorePair(item.totalScore, item.maxScore)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-[18px] text-center font-medium tabular-nums sm:px-5">
                            {formatPercent(item.gradePercent)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-center">
                            <ResultBadge passed={item.isPassed} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-center">
                            <span
                              className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${getGradingBadgeClass(item.gradingStatus)}`}
                            >
                              {formatStatus(item.gradingStatus)}
                            </span>
                          </td>
                          <td className="px-2 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandedRow(rowKey)}
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Hide" : "Show"} score details for student ${item.studentId ?? "record"}`}
                              className="inline-grid size-8 place-items-center rounded-md text-[#4d4658] transition-colors hover:bg-[#eee8fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7654d8]"
                            >
                              {isExpanded ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="px-3 pb-4 pt-1 sm:px-5">
                              <ExpandedScoreDetails item={item} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
            <p className="text-xs font-medium text-[#596273] sm:text-sm">
              {error
                ? "Results unavailable"
                : filteredScores.length === 0
                  ? "Showing 0 results"
                  : `Showing ${firstVisibleResult}–${lastVisibleResult} of ${filteredScores.length} results`}
            </p>
            <nav aria-label="Student result pages" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1 || filteredScores.length === 0 || Boolean(error) || loading}
                aria-label="Previous page"
                className="grid size-8 place-items-center rounded-md border border-[#4d4658] bg-[#eee9f2] text-[#293243] hover:bg-[#e3d9f3] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                  disabled={filteredScores.length === 0 || Boolean(error) || loading}
                  aria-current={currentPage === pageNumber ? "page" : undefined}
                  className={`grid size-8 place-items-center rounded-md border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                    currentPage === pageNumber
                      ? "border-[#7654d8] bg-[#9c83f6] text-[#111827]"
                      : "border-[#4d4658] bg-[#eee9f2] text-[#293243] hover:bg-[#e3d9f3]"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages || filteredScores.length === 0 || Boolean(error) || loading}
                aria-label="Next page"
                className="grid size-8 place-items-center rounded-md border border-[#4d4658] bg-[#eee9f2] text-[#293243] hover:bg-[#e3d9f3] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </nav>
          </div>
        </section>

        <footer className="pb-2 pt-1 text-center text-xs text-[#647084]">
          Edu-Meet Quiz/Exam Management · Faculty Score Overview
        </footer>
      </div>
    </main>
  );
}
