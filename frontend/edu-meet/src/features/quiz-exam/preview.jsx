
import { useState } from "react";
import { createRoot } from "react-dom/client";

import FacultyQuizDashboard from "./pages/FacultyQuizDashboard.jsx";
import FacultyActivityBuilder from "./pages/FacultyActivityBuilder.jsx";

import "./styles/quiz-exam.css";

function QuizExamPreview() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  function handleSave(activityData) {
    console.log("Prepared assessment data:", activityData);
  }

  if (currentPage === "builder") {
    return (
      <FacultyActivityBuilder
        onBack={() => setCurrentPage("dashboard")}
        onSave={handleSave}
      />
    );
  }

  return (
    <FacultyQuizDashboard
      onCreate={() => setCurrentPage("builder")}
    />
  );
}

createRoot(document.getElementById("quiz-exam-root")).render(
  <QuizExamPreview />
);
