
import { useState } from "react";
import { Button } from "@quiz/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  Save,
  Send,
  CircleHelp,
  CheckCircle2,
} from "lucide-react";

// TEMPORARY DEMO DATA.
// These will eventually come from the Dean's faculty assignments API.
const DEMO_ASSIGNED_COURSES = [
  {
    id: "os-lab",
    courseName: "Operating Systems (LAB)",
    courseCode: "45570 - CSP213L",
    classes: [
      { id: 501, name: "BSCS 2-A" },
      { id: 502, name: "BSCS 2-B" },
    ],
  },
  {
    id: "dsa-lec",
    courseName: "Data Structures & Algorithms (LEC)",
    courseCode: "45569 - CSP213A",
    classes: [
      { id: 601, name: "BSCS 2-A" },
      { id: 602, name: "BSCS 2-B" },
    ],
  },
  {
    id: "gvcs-lab",
    courseName: "Graphics and Visual Computing (LAB)",
    courseCode: "45574 - CSP215L",
    classes: [
      { id: 701, name: "BSCS 2-A" },
    ],
  },
];

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "IDENTIFICATION", label: "Identification" },
  { value: "TRUE_FALSE", label: "True or False" },
  { value: "ESSAY", label: "Essay" },
];

function createQuestion(type) {
  return {
    id: `question-${Date.now()}-${Math.random()}`,
    type,
    prompt: "",
    points: type === "ESSAY" ? 5 : 1,
    options:
      type === "MULTIPLE_CHOICE"
        ? ["", "", "", ""]
        : [],
    correctAnswerIndex: 0,
    correctAnswer: type === "TRUE_FALSE" ? true : "",
  };
}

function FieldLabel({ children }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {children}
    </label>
  );
}

export default function FacultyActivityBuilder({
  onBack,
  onSave,
}) {
  const [title, setTitle] = useState("");
  const [activityType, setActivityType] = useState("QUIZ");
  const [courseId, setCourseId] = useState("");
  const [targetClassIds, setTargetClassIds] = useState([]);
  const [passingGrade, setPassingGrade] = useState(75);
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const selectedCourse = DEMO_ASSIGNED_COURSES.find(
    (course) => course.id === courseId
  );

  function handleCourseChange(value) {
    setCourseId(value);
    setTargetClassIds([]);
    setErrors({});
  }

  function toggleTargetClass(classId) {
    setTargetClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId]
    );
  }

  function addQuestion(type) {
    setQuestions((current) => [
      ...current,
      createQuestion(type),
    ]);

    setMessage("");
  }

  function updateQuestion(questionId, field, value) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? { ...question, [field]: value }
          : question
      )
    );
  }

  function updateOption(questionId, optionIndex, value) {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;

        const options = [...question.options];
        options[optionIndex] = value;

        return { ...question, options };
      })
    );
  }

  function addOption(questionId) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId &&
        question.options.length < 6
          ? {
              ...question,
              options: [...question.options, ""],
            }
          : question
      )
    );
  }

  function removeOption(questionId) {
    setQuestions((current) =>
      current.map((question) => {
        if (
          question.id !== questionId ||
          question.options.length <= 2
        ) {
          return question;
        }

        const options = question.options.slice(0, -1);

        return {
          ...question,
          options,
          correctAnswerIndex: Math.min(
            question.correctAnswerIndex,
            options.length - 1
          ),
        };
      })
    );
  }

  function deleteQuestion(questionId) {
    setQuestions((current) =>
      current.filter((question) => question.id !== questionId)
    );
  }

  function validateForm() {
    const nextErrors = {};

    if (!title.trim()) {
      nextErrors.title = "Enter an assessment title.";
    } else if (title.trim().length > 200) {
      nextErrors.title = "Title cannot exceed 200 characters.";
    }

    if (!selectedCourse) {
      nextErrors.course = "Select an assigned subject/course.";
    }

    if (targetClassIds.length === 0) {
      nextErrors.classes = "Select at least one target class.";
    }

    if (
      !Number.isFinite(Number(passingGrade)) ||
      Number(passingGrade) < 0 ||
      Number(passingGrade) > 100
    ) {
      nextErrors.passingGrade =
        "Passing grade must be between 0 and 100.";
    }

    if (questions.length === 0) {
      nextErrors.questions = "Add at least one question.";
    }

    questions.forEach((question, index) => {
      if (!question.prompt.trim()) {
        nextErrors[`question-${question.id}`] =
          `Enter the text for Question ${index + 1}.`;
      }

      if (
        !Number.isFinite(Number(question.points)) ||
        Number(question.points) <= 0
      ) {
        nextErrors[`points-${question.id}`] =
          `Enter a valid point value for Question ${index + 1}.`;
      }

      if (question.type === "MULTIPLE_CHOICE") {
        if (
          question.options.length < 2 ||
          question.options.some((option) => !option.trim())
        ) {
          nextErrors[`options-${question.id}`] =
            `Complete all choices for Question ${index + 1}.`;
        }
      }

      if (
        question.type === "IDENTIFICATION" &&
        !String(question.correctAnswer).trim()
      ) {
        nextErrors[`answer-${question.id}`] =
          `Enter the correct answer for Question ${index + 1}.`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave(saveStatus) {
    setMessage("");

    if (!validateForm()) {
      setMessage(
        "Please complete the required fields before proceeding."
      );
      return;
    }

    const activityData = {
      name: title.trim(),
      type: activityType,
      course_name: selectedCourse.courseName,
      course_code: selectedCourse.courseCode,
      passing_grade_percent: Number(passingGrade),
      target_class_ids: targetClassIds,

      question_and_answer: questions.map((question, index) => ({
        id: question.id,
        question_number: index + 1,
        type: question.type,
        question: question.prompt.trim(),
        points: Number(question.points),

        ...(question.type === "MULTIPLE_CHOICE" && {
          options: question.options.map((option) => option.trim()),
          correct_answer_index: Number(
            question.correctAnswerIndex
          ),
        }),

        ...(question.type === "IDENTIFICATION" && {
          correct_answer: question.correctAnswer.trim(),
        }),

        ...(question.type === "TRUE_FALSE" && {
          correct_answer: question.correctAnswer,
        }),

        ...(question.type === "ESSAY" && {
          requires_manual_grading: true,
        }),
      })),

      status: saveStatus,
    };

    // Local preview only. Database saving will be connected through PHP.
    if (onSave) {
      onSave(activityData);
    } else {
      console.log("Activity preview data:", activityData);
    }

    setMessage(
      saveStatus === "draft"
        ? "Draft prepared successfully. Database saving will be connected later."
        : "Assessment prepared for publishing. Backend publishing will be connected later."
    );
  }

  return (
    <main className="min-h-screen bg-[#d9d0df] px-4 py-6 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* PAGE HEADER */}
        <header className="flex items-center gap-3 border-b border-[#aaa0b4] pb-5">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            aria-label="Go back"
            className="bg-white"
          >
            <ArrowLeft />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-6 text-violet-600" />

              <h1 className="text-2xl font-extrabold">
                Create Quiz / Exam
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Create an academic assessment for your assigned classes.
            </p>
          </div>
        </header>

        {/* DEMO DATA NOTICE */}
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Preview notice:</strong> Subject and class options
          currently use sample data. Actual Dean-assigned records
          will be loaded from the backend later.
        </div>

        {/* ASSESSMENT DETAILS */}
        <section className="space-y-5 rounded-xl border border-[#b8afc0] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-bold">
              1. Assessment Details
            </h2>

            <p className="text-sm text-slate-500">
              Enter the basic information for your assessment.
            </p>
          </div>

          <div>
            <FieldLabel>Quiz / Exam Title *</FieldLabel>

            <input
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Lesson 1 - Introduction to Operating Systems"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />

            {errors.title && (
              <p className="mt-1 text-xs text-red-600">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>Assigned Subject / Course *</FieldLabel>

            <select
              value={courseId}
              onChange={(event) =>
                handleCourseChange(event.target.value)
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500"
            >
              <option value="">
                Select an assigned subject
              </option>

              {DEMO_ASSIGNED_COURSES.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseName} — {course.courseCode}
                </option>
              ))}
            </select>

            {errors.course && (
              <p className="mt-1 text-xs text-red-600">
                {errors.course}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>Target Classes *</FieldLabel>

            {!selectedCourse ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Select a subject/course first to see its assigned classes.
              </div>
            ) : (
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                {selectedCourse.classes.map((classItem) => (
                  <label
                    key={classItem.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm hover:border-violet-400"
                  >
                    <input
                      type="checkbox"
                      checked={targetClassIds.includes(classItem.id)}
                      onChange={() =>
                        toggleTargetClass(classItem.id)
                      }
                      className="size-4 accent-violet-600"
                    />

                    <span className="font-medium">
                      {classItem.name}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {errors.classes && (
              <p className="mt-1 text-xs text-red-600">
                {errors.classes}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>Activity Type *</FieldLabel>

            <div className="grid grid-cols-2 gap-3">
              {["QUIZ", "EXAM"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityType(type)}
                  className={`rounded-lg border-2 p-3 text-sm font-bold transition ${
                    activityType === type
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                  }`}
                >
                  {type === "QUIZ" ? "Quiz" : "Examination"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Passing Grade (%) *</FieldLabel>

            <input
              type="number"
              min="0"
              max="100"
              value={passingGrade}
              onChange={(event) =>
                setPassingGrade(event.target.value)
              }
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-violet-500"
            />

            {errors.passingGrade && (
              <p className="mt-1 text-xs text-red-600">
                {errors.passingGrade}
              </p>
            )}
          </div>
        </section>

        {/* QUESTION BUILDER */}
        <section className="space-y-5 rounded-xl border border-[#b8afc0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                2. Questions and Answers
              </h2>

              <p className="text-sm text-slate-500">
                Add questions and select the appropriate answer type.
              </p>
            </div>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              {questions.length} Questions
            </span>
          </div>

          {questions.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <CircleHelp className="mx-auto mb-3 size-9 text-violet-400" />

              <p className="font-semibold">
                No questions added yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Choose a question type below to get started.
              </p>
            </div>
          )}

          {questions.map((question, index) => (
            <article
              key={question.id}
              className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">
                    Question {index + 1}
                  </p>

                  <p className="text-xs text-violet-700">
                    {
                      QUESTION_TYPES.find(
                        (type) => type.value === question.type
                      )?.label
                    }
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteQuestion(question.id)}
                  aria-label={`Delete question ${index + 1}`}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 />
                </Button>
              </div>

              <div>
                <FieldLabel>Question *</FieldLabel>

                <textarea
                  value={question.prompt}
                  onChange={(event) =>
                    updateQuestion(
                      question.id,
                      "prompt",
                      event.target.value
                    )
                  }
                  placeholder="Enter your question here..."
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-violet-500"
                />

                {errors[`question-${question.id}`] && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors[`question-${question.id}`]}
                  </p>
                )}
              </div>

              {/* MULTIPLE CHOICE */}
              {question.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-3">
                  <FieldLabel>
                    Answer Choices
                    <span className="ml-1 font-normal text-slate-500">
                      (Select the radio button beside the correct answer.)
                    </span>
                  </FieldLabel>

                  {question.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="flex items-center gap-3"
                    >
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={
                          question.correctAnswerIndex === optionIndex
                        }
                        onChange={() =>
                          updateQuestion(
                            question.id,
                            "correctAnswerIndex",
                            optionIndex
                          )
                        }
                        className="size-4 accent-violet-600"
                        aria-label={`Mark option ${optionIndex + 1} as correct`}
                      />

                      <input
                        value={option}
                        onChange={(event) =>
                          updateOption(
                            question.id,
                            optionIndex,
                            event.target.value
                          )
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500"
                      />
                    </label>
                  ))}

                  {errors[`options-${question.id}`] && (
                    <p className="text-xs text-red-600">
                      {errors[`options-${question.id}`]}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={question.options.length >= 6}
                      onClick={() => addOption(question.id)}
                    >
                      <Plus />
                      Add Option
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={question.options.length <= 2}
                      onClick={() => removeOption(question.id)}
                    >
                      <Trash2 />
                      Remove Last Option
                    </Button>
                  </div>
                </div>
              )}

              {/* IDENTIFICATION */}
              {question.type === "IDENTIFICATION" && (
                <div>
                  <FieldLabel>Correct Answer *</FieldLabel>

                  <input
                    value={question.correctAnswer}
                    onChange={(event) =>
                      updateQuestion(
                        question.id,
                        "correctAnswer",
                        event.target.value
                      )
                    }
                    placeholder="Enter the expected answer"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500"
                  />

                  {errors[`answer-${question.id}`] && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors[`answer-${question.id}`]}
                    </p>
                  )}
                </div>
              )}

              {/* TRUE OR FALSE */}
              {question.type === "TRUE_FALSE" && (
                <div className="space-y-2">
                  <FieldLabel>Correct Answer</FieldLabel>

                  <div className="grid grid-cols-2 gap-3">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() =>
                          updateQuestion(
                            question.id,
                            "correctAnswer",
                            value
                          )
                        }
                        className={`rounded-lg border-2 p-3 text-sm font-bold ${
                          question.correctAnswer === value
                            ? value
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {value ? "TRUE" : "FALSE"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ESSAY */}
              {question.type === "ESSAY" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <p className="font-bold">
                    Manual Faculty Grading
                  </p>

                  <p className="mt-1">
                    Essay responses will be reviewed and scored by
                    the faculty. They will not be automatically
                    marked correct or incorrect.
                  </p>
                </div>
              )}

              {/* QUESTION POINTS */}
              <div className="max-w-xs">
                <FieldLabel>
                  {question.type === "ESSAY"
                    ? "Maximum Points"
                    : "Points"}
                </FieldLabel>

                <input
                  type="number"
                  min="1"
                  value={question.points}
                  onChange={(event) =>
                    updateQuestion(
                      question.id,
                      "points",
                      event.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500"
                />

                {errors[`points-${question.id}`] && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors[`points-${question.id}`]}
                  </p>
                )}
              </div>
            </article>
          ))}

          {errors.questions && (
            <p className="text-sm text-red-600">
              {errors.questions}
            </p>
          )}

          {/* ADD QUESTION TYPE BUTTONS */}
          <div className="space-y-3 border-t border-slate-200 pt-5">
            <p className="text-sm font-bold">
              Add a Question
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUESTION_TYPES.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant="outline"
                  onClick={() => addQuestion(type.value)}
                  className="justify-start bg-white"
                >
                  <Plus />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* FORM ACTIONS */}
        <section className="space-y-3 rounded-xl border border-[#b8afc0] bg-white p-5 shadow-sm">
          {message && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              {message}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="bg-white"
            >
              Cancel
            </Button>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                className="bg-white"
              >
                <Save />
                Save as Draft
              </Button>

              <Button
                onClick={() => handleSave("published")}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                <Send />
                Publish
              </Button>
            </div>
          </div>
        </section>

        <footer className="pb-4 text-center text-xs text-slate-500">
          Edu-Meet · Faculty Quiz/Exam Builder · Development Preview
        </footer>

      </div>
    </main>
  );
}
