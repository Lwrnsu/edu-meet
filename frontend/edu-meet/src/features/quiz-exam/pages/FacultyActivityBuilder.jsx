
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
  AlertCircle,
} from "lucide-react";

// TEMPORARY LOCAL DEMO ASSIGNMENT.
// Replace this with the actual faculty-assignment API when available.
const DEMO_ASSIGNED_COURSES = [
  {
    id: "oop-demo",
    courseName: "Object-Oriented Programming",
    courseCode: "OOP101",
    classes: [
      {
        id: 1,
        name: "BSCS 1A",
        code: "BSCS-1A",
      },
    ],
  },
];

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "IDENTIFICATION", label: "Identification" },
  { value: "TRUE_FALSE", label: "True or False" },
  { value: "ESSAY", label: "Essay" },
];

// NORMALIZE QUESTION TYPE VALUES
function normalizeQuestionType(type) {
  return String(type || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// READ QUESTION DATA FROM THE EXISTING ASSESSMENT
function readExistingQuestions(initialActivity) {
  if (!initialActivity) {
    return [];
  }

  let rawQuestions =
    initialActivity.question_and_answer ??
    initialActivity.questionAndAnswer ??
    initialActivity.questions;

  if (typeof rawQuestions === "string") {
    try {
      rawQuestions = JSON.parse(rawQuestions);
    } catch {
      return [];
    }
  }

  // Handle object wrappers if returned by another API layer.
  if (rawQuestions && !Array.isArray(rawQuestions)) {
    if (typeof rawQuestions.value === "string") {
      try {
        rawQuestions = JSON.parse(rawQuestions.value);
      } catch {
        return [];
      }
    }
  }

  if (!Array.isArray(rawQuestions)) {
    return [];
  }

  return rawQuestions.map((question, index) => {
    const type = normalizeQuestionType(question.type);

    const options = Array.isArray(question.options)
      ? question.options.map((option) => String(option ?? ""))
      : [];

    const acceptedAnswers = Array.isArray(question.acceptedAnswers)
      ? question.acceptedAnswers
      : [];

    const correctAnswer = String(
      question.correctAnswer ??
      acceptedAnswers[0] ??
      ""
    );

    const correctAnswerIndex =
      type === "MULTIPLE_CHOICE"
        ? Math.max(
            0,
            options.findIndex(
              (option) =>
                option.toLowerCase() === correctAnswer.toLowerCase()
            )
          )
        : 0;

    return {
      id: `existing-question-${index}`,
      type,
      prompt: String(
        question.questionText ??
        question.question_text ??
        ""
      ),
      points: question.points ?? 1,
      options,
      correctAnswerIndex,
      correctAnswer:
        type === "TRUE_FALSE"
          ? correctAnswer.toLowerCase() === "false"
            ? "False"
            : "True"
          : correctAnswer,
    };
  });
}

// READ EXISTING TARGET CLASS DATA
function readExistingClasses(initialActivity) {
  if (!initialActivity) {
    return [];
  }

  const classes =
    initialActivity.targetClasses ??
    initialActivity.target_classes ??
    [];

  if (!Array.isArray(classes)) {
    return [];
  }

  return classes.map((classItem) => ({
    id: Number(classItem.classId ?? classItem.class_id),
    name: String(
      classItem.className ?? classItem.class_name ?? ""
    ),
    code: String(
      classItem.classCode ?? classItem.class_code ?? ""
    ),
  })).filter(
    (classItem) =>
      Number.isInteger(classItem.id) &&
      classItem.id > 0 &&
      classItem.name &&
      classItem.code
  );
}

// CREATE A NEW EMPTY QUESTION
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
    correctAnswer: type === "TRUE_FALSE" ? "True" : "",
  };
}

// FORM FIELD LABEL
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
  onUpdate,
  initialActivity = null,
}) {
  const isEditing = Boolean(initialActivity);

  const activityId =
    initialActivity?.id ??
    initialActivity?.activityId ??
    initialActivity?.activity_id;

  const originalStatus = String(
    initialActivity?.status ?? "draft"
  ).toLowerCase();

  const canEdit = !isEditing || originalStatus === "draft";

  const existingClasses = readExistingClasses(initialActivity);

  // Preserve the original assessment course and classes during editing.
  // Do not invent new Dean-assigned classes while the actual class API
  // is not yet connected.
  const existingCourse = initialActivity
    ? {
        id: "existing-assessment-course",
        courseName:
          initialActivity.course_name ??
          initialActivity.courseName ??
          "Unspecified Course",
        courseCode:
          initialActivity.course_code ??
          initialActivity.courseCode ??
          "No course code",
        classes: existingClasses,
      }
    : null;

  const [title, setTitle] = useState(
    initialActivity?.name ??
    initialActivity?.title ??
    ""
  );

  const [activityType, setActivityType] = useState(
    String(initialActivity?.type ?? "QUIZ").toUpperCase()
  );

  const [courseId, setCourseId] = useState(
    isEditing ? "existing-assessment-course" : ""
  );

  const [targetClassIds, setTargetClassIds] = useState(() =>
    existingClasses.map((classItem) => classItem.id)
  );

  const [passingGrade, setPassingGrade] = useState(
    initialActivity?.passing_grade_percent ??
    initialActivity?.passingGradePercent ??
    75
  );

  const [questions, setQuestions] = useState(() =>
    readExistingQuestions(initialActivity)
  );

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);

  const availableCourses = isEditing
    ? [existingCourse]
    : DEMO_ASSIGNED_COURSES;

  const selectedCourse = availableCourses.find(
    (course) => course.id === courseId
  );

  // CHANGE SELECTED COURSE
  function handleCourseChange(value) {
    if (isEditing) {
      return;
    }

    setCourseId(value);
    setTargetClassIds([]);
    setErrors({});
  }

  // SELECT OR DESELECT TARGET CLASS
  function toggleTargetClass(classId) {
    if (isEditing) {
      return;
    }

    setTargetClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId]
    );
  }

  // ADD QUESTION
  function addQuestion(type) {
    setQuestions((current) => [
      ...current,
      createQuestion(type),
    ]);

    setMessage("");
    setErrors({});
  }

  // UPDATE QUESTION FIELD
  function updateQuestion(questionId, field, value) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? { ...question, [field]: value }
          : question
      )
    );
  }

  // UPDATE MULTIPLE-CHOICE OPTION
  function updateOption(questionId, optionIndex, value) {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        const options = [...question.options];
        options[optionIndex] = value;

        return { ...question, options };
      })
    );
  }

  // ADD MULTIPLE-CHOICE OPTION
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

  // REMOVE LAST MULTIPLE-CHOICE OPTION
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

  // DELETE QUESTION
  function deleteQuestion(questionId) {
    setQuestions((current) =>
      current.filter((question) => question.id !== questionId)
    );
  }

  // VALIDATE FORM
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
        } else if (
          question.correctAnswerIndex < 0 ||
          question.correctAnswerIndex >= question.options.length
        ) {
          nextErrors[`options-${question.id}`] =
            `Select the correct answer for Question ${index + 1}.`;
        }
      }

      if (
        question.type === "IDENTIFICATION" &&
        !String(question.correctAnswer).trim()
      ) {
        nextErrors[`answer-${question.id}`] =
          `Enter the correct answer for Question ${index + 1}.`;
      }

      if (
        question.type === "TRUE_FALSE" &&
        !["True", "False"].includes(question.correctAnswer)
      ) {
        nextErrors[`answer-${question.id}`] =
          `Select the correct answer for Question ${index + 1}.`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  // BUILD REQUEST PAYLOAD FOR THE BACKEND
  function buildRequestPayload() {
    const selectedClasses = selectedCourse.classes.filter(
      (classItem) => targetClassIds.includes(classItem.id)
    );

    return {
      name: title.trim(),
      type: activityType,
      courseName: selectedCourse.courseName,
      courseCode: selectedCourse.courseCode,
      passingGradePercent: Number(passingGrade),

      questions: questions.map((question) => {
        let correctAnswer = null;
        let acceptedAnswers = [];
        let options = [];

        if (question.type === "MULTIPLE_CHOICE") {
          options = question.options.map((option) => option.trim());

          correctAnswer =
            options[question.correctAnswerIndex] ?? null;
        }

        if (question.type === "IDENTIFICATION") {
          correctAnswer = question.correctAnswer.trim();
          acceptedAnswers = [correctAnswer];
        }

        if (question.type === "TRUE_FALSE") {
          options = ["True", "False"];
          correctAnswer = question.correctAnswer;
        }

        return {
          type: question.type,
          questionText: question.prompt.trim(),
          options,
          correctAnswer,
          acceptedAnswers,
          points: Number(question.points),
        };
      }),

      targetClasses: selectedClasses.map((classItem) => ({
        classId: classItem.id,
        className: classItem.name,
        classCode: classItem.code,
      })),
    };
  }

  // SAVE NEW ASSESSMENT OR UPDATE EXISTING DRAFT
  async function handleSave(saveStatus) {
    setMessage("");
    setMessageIsError(false);

    if (!canEdit) {
      setMessage(
        "Only draft assessments can be edited."
      );
      setMessageIsError(true);
      return;
    }

    if (!validateForm()) {
      setMessage(
        "Please complete the required fields before proceeding."
      );
      setMessageIsError(true);
      return;
    }

    const payload = buildRequestPayload();

    if (isEditing) {
      if (typeof onUpdate !== "function") {
        setMessage(
          "The update function is not connected yet."
        );
        setMessageIsError(true);
        return;
      }
    } else if (typeof onSave !== "function") {
      setMessage("The save function is not connected.");
      setMessageIsError(true);
      return;
    }

    setSaving(true);

    try {
      if (isEditing) {
        // Update the existing assessment instead of creating a duplicate.
        await onUpdate(payload, activityId);
      } else {
        await onSave(payload, saveStatus);
      }
    } catch (error) {
      setMessage(
        error.message || "Unable to save the assessment."
      );
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#d9d0df] px-4 py-6 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* HEADER */}
        <header className="flex items-center gap-3 border-b border-[#aaa0b4] pb-5">

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onBack}
            disabled={saving}
            aria-label="Go back"
            className="bg-white"
          >
            <ArrowLeft />
          </Button>

          <div>
            <div className="flex items-center gap-2">

              <BookOpen className="size-6 text-violet-600" />

              <h1 className="text-2xl font-extrabold">
                {isEditing
                  ? "Edit Quiz / Exam"
                  : "Create Quiz / Exam"}
              </h1>

            </div>

            <p className="mt-1 text-sm text-slate-600">
              {isEditing
                ? "Update your existing draft assessment."
                : "Create an academic assessment for your assigned classes."}
            </p>

          </div>

        </header>

        {/* DEVELOPMENT NOTICE */}
        {!isEditing ? (

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Development demo assignment:</strong> The
            course and class below are local test data matching
            the current demo database record. Actual faculty
            teaching assignments and classes still need to be connected.
          </div>

        ) : (

          <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800">
            <strong>Editing assessment #{activityId}:</strong>{" "}
            The original course and target classes are preserved
            while the live class-assignment integration is pending.
          </div>

        )}

        {/* NON-DRAFT NOTICE */}
        {isEditing && !canEdit && (

          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            This assessment is not a draft and cannot be edited.
          </div>

        )}

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

          {/* TITLE */}
          <div>

            <FieldLabel>Quiz / Exam Title *</FieldLabel>

            <input
              value={title}
              maxLength={200}
              disabled={saving || !canEdit}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Lesson 1 - Introduction to OOP"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100"
            />

            {errors.title && (
              <p className="mt-1 text-xs text-red-600">
                {errors.title}
              </p>
            )}

          </div>

          {/* COURSE */}
          <div>

            <FieldLabel>Assigned Subject / Course *</FieldLabel>

            <select
              value={courseId}
              disabled={saving || isEditing || !canEdit}
              onChange={(event) =>
                handleCourseChange(event.target.value)
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100"
            >

              <option value="">
                Select an assigned subject
              </option>

              {availableCourses.map((course) => (
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

          {/* TARGET CLASSES */}
          <div>

            <FieldLabel>Target Classes *</FieldLabel>

            {!selectedCourse ? (

              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Select a subject/course first to see its assigned classes.
              </div>

            ) : selectedCourse.classes.length === 0 ? (

              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                No target classes were returned for this assessment.
                Verify the assessment's class assignments before editing.
              </div>

            ) : (

              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">

                {selectedCourse.classes.map((classItem) => (

                  <label
                    key={classItem.id}
                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm"
                  >

                    <input
                      type="checkbox"
                      checked={targetClassIds.includes(classItem.id)}
                      disabled={saving || isEditing || !canEdit}
                      onChange={() =>
                        toggleTargetClass(classItem.id)
                      }
                      className="size-4 accent-violet-600"
                    />

                    <span className="font-medium">
                      {classItem.name} ({classItem.code})
                    </span>

                  </label>

                ))}

              </div>

            )}

            {isEditing && (
              <p className="mt-2 text-xs text-slate-500">
                Target class changes are disabled until the actual
                faculty-assignment integration is available.
              </p>
            )}

            {errors.classes && (
              <p className="mt-1 text-xs text-red-600">
                {errors.classes}
              </p>
            )}

          </div>

          {/* ACTIVITY TYPE */}
          <div>

            <FieldLabel>Activity Type *</FieldLabel>

            <div className="grid grid-cols-2 gap-3">

              {["QUIZ", "EXAM"].map((type) => (

                <button
                  key={type}
                  type="button"
                  disabled={saving || !canEdit}
                  onClick={() => setActivityType(type)}
                  className={`rounded-lg border-2 p-3 text-sm font-bold transition ${
                    activityType === type
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {type === "QUIZ" ? "Quiz" : "Examination"}
                </button>

              ))}

            </div>

          </div>

          {/* PASSING GRADE */}
          <div>

            <FieldLabel>Passing Grade (%) *</FieldLabel>

            <input
              type="number"
              min="0"
              max="100"
              value={passingGrade}
              disabled={saving || !canEdit}
              onChange={(event) =>
                setPassingGrade(event.target.value)
              }
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100"
            />

            {errors.passingGrade && (
              <p className="mt-1 text-xs text-red-600">
                {errors.passingGrade}
              </p>
            )}

          </div>

        </section>

        {/* QUESTIONS */}
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

          {/* QUESTION CARDS */}
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
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteQuestion(question.id)}
                  aria-label={`Delete question ${index + 1}`}
                  className="text-red-600 hover:bg-red-50"
                  disabled={saving || !canEdit}
                >
                  <Trash2 />
                </Button>

              </div>

              {/* QUESTION TEXT */}
              <div>

                <FieldLabel>Question *</FieldLabel>

                <textarea
                  value={question.prompt}
                  disabled={saving || !canEdit}
                  onChange={(event) =>
                    updateQuestion(
                      question.id,
                      "prompt",
                      event.target.value
                    )
                  }
                  placeholder="Enter your question here..."
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100"
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
                        disabled={saving || !canEdit}
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
                        disabled={saving || !canEdit}
                        onChange={(event) =>
                          updateOption(
                            question.id,
                            optionIndex,
                            event.target.value
                          )
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100"
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
                      disabled={
                        question.options.length >= 6 ||
                        saving ||
                        !canEdit
                      }
                      onClick={() => addOption(question.id)}
                    >
                      <Plus />
                      Add Option
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        question.options.length <= 2 ||
                        saving ||
                        !canEdit
                      }
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
                    disabled={saving || !canEdit}
                    onChange={(event) =>
                      updateQuestion(
                        question.id,
                        "correctAnswer",
                        event.target.value
                      )
                    }
                    placeholder="Enter the expected answer"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100"
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

                    {["True", "False"].map((value) => (

                      <button
                        key={value}
                        type="button"
                        disabled={saving || !canEdit}
                        onClick={() =>
                          updateQuestion(
                            question.id,
                            "correctAnswer",
                            value
                          )
                        }
                        className={`rounded-lg border-2 p-3 text-sm font-bold ${
                          question.correctAnswer === value
                            ? value === "True"
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-600"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {value.toUpperCase()}
                      </button>

                    ))}

                  </div>

                  {errors[`answer-${question.id}`] && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors[`answer-${question.id}`]}
                    </p>
                  )}

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

              {/* POINTS */}
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
                  disabled={saving || !canEdit}
                  onChange={(event) =>
                    updateQuestion(
                      question.id,
                      "points",
                      event.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100"
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

          {/* ADD QUESTION BUTTONS */}
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
                  disabled={saving || !canEdit}
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

        {/* SAVE SECTION */}
        <section className="space-y-3 rounded-xl border border-[#b8afc0] bg-white p-5 shadow-sm">

          {message && (

            <div
              role="alert"
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                messageIsError
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-violet-200 bg-violet-50 text-violet-800"
              }`}
            >

              {messageIsError ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              )}

              {message}

            </div>

          )}

          <div className="flex flex-wrap items-center justify-between gap-3">

            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={saving}
              className="bg-white"
            >
              Cancel
            </Button>

            <div className="flex flex-wrap gap-2">

              {isEditing ? (

                <Button
                  type="button"
                  onClick={() => handleSave("update")}
                  disabled={saving || !canEdit}
                  className="bg-violet-600 text-white hover:bg-violet-700"
                >
                  <Save />
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>

              ) : (

                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSave("draft")}
                    disabled={saving}
                    className="bg-white"
                  >
                    <Save />
                    {saving ? "Saving..." : "Save as Draft"}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSave("published")}
                    disabled={saving}
                    className="bg-violet-600 text-white hover:bg-violet-700"
                  >
                    <Send />
                    {saving ? "Publishing..." : "Publish"}
                  </Button>
                </>

              )}

            </div>

          </div>

        </section>

        <footer className="pb-4 text-center text-xs text-slate-500">
          Edu-Meet · Faculty Quiz/Exam Builder
        </footer>

      </div>
    </main>
  );
}
