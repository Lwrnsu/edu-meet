
import { useMemo, useState } from "react";
import { Button } from "@quiz/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Users,
  ClipboardList,
  Trash2,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";

const initialQuizzes = [
  {
    id: 1,
    course: "Operating Systems (LAB)",
    code: "45570 - CSP213L",
    title: "Lesson 1: I/O Devices & Controllers",
    duration: 60,
    questions: 10,
    passingGrade: 75,
    students: 29,
    status: "Published",
    color: "#A38AF4",
  },
  {
    id: 2,
    course: "Data Structures & Algorithms (LEC)",
    code: "45569 - CSP213A",
    title: "Lesson 5: Binary Search Trees",
    duration: 45,
    questions: 15,
    passingGrade: 80,
    students: 29,
    status: "Published",
    color: "#4381ED",
  },
  {
    id: 3,
    course: "Data Structures & Algorithms (LAB)",
    code: "45567 - CSC211L",
    title: "Lesson 7: Heaps",
    duration: 30,
    questions: 10,
    passingGrade: 75,
    students: 29,
    status: "Draft",
    color: "#465061",
  },
  {
    id: 4,
    course: "Graphics and Visual Computing (LAB)",
    code: "45574 - CSP215L",
    title: "Lesson 3: Photoshop",
    duration: 60,
    questions: 45,
    passingGrade: 90,
    students: 29,
    status: "Closed",
    color: "#12CFBB",
  },
];

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

function QuizCard({ quiz, onEdit, onDelete, onViewScores }) {
  const statusStyles = {
    Published: "bg-green-100 text-green-700",
    Draft: "bg-amber-100 text-amber-700",
    Closed: "bg-slate-200 text-slate-700",
  };

  return (
    <article className="overflow-hidden rounded-xl border-2 border-[#263244] bg-white shadow-[0_4px_0_#8792a3]">
      <div
        className="border-b-2 border-[#263244] p-3"
        style={{ backgroundColor: quiz.color }}
      >
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
            <Clock3 className="size-4" />
            {quiz.duration} min limit
          </span>

          <span className="flex items-center gap-1.5">
            <ClipboardList className="size-4" />
            {quiz.questions} Questions
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-[#364152]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            Pass: {quiz.passingGrade}%
          </span>

          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {quiz.students} Students
          </span>
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[quiz.status]}`}
          >
            {quiz.status}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${quiz.title}`}
              onClick={() => onDelete(quiz)}
              className="text-slate-600 hover:bg-red-100 hover:text-red-600"
            >
              <Trash2 />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${quiz.title}`}
              onClick={() => onEdit(quiz)}
            >
              <Pencil />
            </Button>

            <Button
              size="sm"
              onClick={() => onViewScores(quiz)}
              className="bg-[#9378ed] text-white hover:bg-[#8064dc]"
            >
              View Scores
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function FacultyQuizDashboard({ onCreate }) {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [notice, setNotice] = useState("");

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const matchesSearch =
        quiz.title.toLowerCase().includes(search.toLowerCase()) ||
        quiz.course.toLowerCase().includes(search.toLowerCase()) ||
        quiz.code.toLowerCase().includes(search.toLowerCase());

      const matchesFilter = filter === "All" || quiz.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [quizzes, search, filter]);

  const activeCount = quizzes.filter(
    (quiz) => quiz.status === "Published"
  ).length;

  const draftCount = quizzes.filter(
    (quiz) => quiz.status === "Draft"
  ).length;

  function handleDelete(quiz) {
    const confirmed = window.confirm(
      `Delete "${quiz.title}" from this local preview?`
    );

    if (!confirmed) return;

    setQuizzes((current) =>
      current.filter((item) => item.id !== quiz.id)
    );

    setNotice(
      `"${quiz.title}" was removed from this local preview. This has not changed the database.`
    );
  }

  function handleEdit(quiz) {
    setNotice(
      `Edit screen for "${quiz.title}" will be implemented in the Quiz Builder phase.`
    );
  }

  function handleViewScores(quiz) {
    setNotice(
      `Score Tracker for "${quiz.title}" will be implemented in the next phase.`
    );
  }

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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Quizzes"
            value={quizzes.length}
            description="All Modules"
            icon={BookOpen}
            color="#9877F0"
          />

          <MetricCard
            title="Active & Published"
            value={activeCount}
            description="Live for students"
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
            title="Total Enrolled"
            value="181"
            description="Students"
            icon={Users}
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
                Manage your academic assessments.
              </p>
            </div>

            <Button
              onClick={onCreate}
              className="bg-[#9478ed] text-white hover:bg-[#8063da]"
            >
              <Plus className="mr-1 size-4" />
              Create Quiz / Exam
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#afa6b8] bg-white/70 p-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border bg-white px-3">
              <Search className="size-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quizzes, courses, or course codes..."
                className="h-10 w-full bg-transparent text-sm outline-none"
                aria-label="Search quizzes"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
              aria-label="Filter quizzes by status"
            >
              <option value="All">All Activities</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {notice && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800"
            >
              <span>{notice}</span>

              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {filteredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewScores={handleViewScores}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-400 bg-white/60 p-12 text-center">
              <BookOpen className="mx-auto mb-3 size-8 text-slate-400" />
              <p className="font-semibold">No matching quizzes found.</p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search term or filter.
              </p>
            </div>
          )}
        </section>

        <footer className="border-t border-[#aaa0b4] pt-4 text-center text-xs text-[#667085]">
          Edu-Meet Quiz/Exam Management · Faculty Preview
        </footer>

      </div>
    </main>
  );
}
