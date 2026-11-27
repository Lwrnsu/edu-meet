import { useState, useEffect } from "react";
import "./Faculty.css";

/* ---------- Shared bits ---------- */
const Logo = () => (
  <svg viewBox="0 0 97 90" aria-hidden="true">
    <rect x="30" y="4" width="38" height="30" fill="none" stroke="#d4d4d8" strokeWidth="7" />
    <rect x="10" y="44" width="78" height="30" fill="none" stroke="#d4d4d8" strokeWidth="7" />
    <path d="M2 84h94" stroke="#d4d4d8" strokeWidth="7" />
  </svg>
);

const Header = ({ title = "Faculty Assignments", subtitle = "Create coding problems and review submissions!" }) => (
  <header>
    <div className="brand">
      <Logo />
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  </header>
);

function Modal({ title, text, children }) {
  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {text && <div>{text}</div>}
        <div className="row">{children}</div>
      </div>
    </div>
  );
}

const post = async (path, body) => {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
};

/* ---------- View 1: Home ---------- */
function Home({ go, questions, onEdit, onDelete }) {
  const [pending, setPending] = useState(null); // { type: "assign" | "delete" | "error", id, text }

  const assign = async (q) => {
    try {
      await post("/api/assign", { questionId: q.id });
      setPending({ type: "assign", id: q.id });
    } catch (e) {
      setPending({ type: "error", text: `Could not assign. ${e.message}` });
    }
  };

  return (
    <>
      <Header />
      <main>
        <div className="top">
          <div>
            <h2>Welcome to Code Editor!</h2>
            <p>Question Lists</p>
          </div>
          <button className="btn" onClick={() => go("questions")}>Create Assignment</button>
        </div>

        <div className="list">
          {questions.length === 0 && <p className="empty">No questions yet.</p>}
          {questions.map((q) => (
            <div className="card" key={q.id}>
              <h3>{q.title}</h3>
              <div className="actions">
                <button className="btn teal" onClick={() => assign(q)}>Assign</button>
                <button className="btn grey" onClick={() => onEdit(q.id)}>Edit</button>
                <button className="btn red" onClick={() => setPending({ type: "delete", id: q.id })}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div className="foot">
          <button className="btn" onClick={() => go("submissions")}>See submissions</button>
        </div>
      </main>

      {pending?.type === "assign" && (
        <Modal title="Project Assigned!">
          <button autoFocus className="btn teal" onClick={() => setPending(null)}>Yes</button>
        </Modal>
      )}
      {pending?.type === "error" && (
        <Modal title="Something went wrong" text={pending.text}>
          <button autoFocus className="btn teal" onClick={() => setPending(null)}>Go Back</button>
        </Modal>
      )}
      {pending?.type === "delete" && (
        <Modal title="Are you sure?" text="This will be deleted forever!">
          <button className="btn red" onClick={() => { onDelete(pending.id); setPending(null); }}>Yes</button>
          <button autoFocus className="btn teal" onClick={() => setPending(null)}>No</button>
        </Modal>
      )}
    </>
  );
}

/* ---------- View 2: Question Management ---------- */
function Questions({ go, questions, setQuestions, editingId, setEditingId }) {
  const editing = questions.find((q) => q.id === editingId);
  const [title, setTitle] = useState(editing ? editing.title : "");
  const [output, setOutput] = useState(editing ? editing.output : "");
  const [notice, setNotice] = useState(null); // "added" | "updated" | "error"
  const [errorText, setErrorText] = useState("");

  const clear = () => { setTitle(""); setOutput(""); };
  const fail = (text) => { setErrorText(text); setNotice("error"); };

  const add = async () => {
    if (!title.trim()) return fail("Enter a title first.");
    try {
      await post("/api/question", { question: title, expectedOutput: output });
      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setQuestions(data.map((q) => ({ id: q.id, title: q.question, output: q.expected_output })));
      clear();
      setNotice("added");
    } catch (e) {
      fail(`Could not add the question. ${e.message}`);
    }
  };

  // Saves the fields into the question opened with Edit on the home page.
  const update = async () => {
    if (!editing) return fail("Press Edit on a question in the list first, then Update.");
    if (!title.trim()) return fail("Enter a title first.");
    try {
      await post("/api/question/edit", { id: editing.id, question: title, expectedOutput: output });
      setQuestions((qs) => qs.map((q) => (q.id === editing.id ? { ...q, title, output } : q)));
      setEditingId(null);
      clear();
      setNotice("updated");
    } catch (e) {
      fail(`Could not update the question. ${e.message}`);
    }
  };

  return (
    <>
      <Header />
      <main>
        <div className="top">
          <h2>Question Management Panel</h2>
          <button className="btn" onClick={() => { setEditingId(null); go("home"); }}>Go Back</button>
        </div>

        <div className="form">
          <input placeholder="Add title here:" aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Add expected output here:" aria-label="Expected output" value={output} onChange={(e) => setOutput(e.target.value)} />
        </div>

        <div className="actions end">
          <button className="btn teal" onClick={add}>Add</button>
          <button className="btn grey" onClick={update}>Update</button>
          <button className="btn red" onClick={clear}>Clear</button>
        </div>
      </main>

      {notice && (
        <Modal
          title={notice === "added" ? "Question Added!" : notice === "updated" ? "Question Updated!" : "Something went wrong"}
          text={notice === "error" ? errorText : undefined}
        >
          <button autoFocus className="btn teal" onClick={() => setNotice(null)}>Go Back</button>
        </Modal>
      )}
    </>
  );
}

/* ---------- View 3: Submissions ---------- */
const Star = () => (
  <svg viewBox="0 0 24 24" className="star" aria-hidden="true">
    <path fill="#f59e0b" d="M12 2.5l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7 5.9 21.1l1.4-6.8L2.2 9.6l6.9-.8z" />
  </svg>
);

function Submissions({ go }) {
  const [subs, setSubs] = useState([]);
  const [viewingId, setViewingId] = useState(null);
  const [gradingId, setGradingId] = useState(null);
  const [score, setScore] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((data) =>
        setSubs(
          data.map((s) => ({
            id: s.id,
            name: s.student_name,
            section: "Student",
            grade: s.score > 0 ? Number(s.score) : null, // DB default is 0 = ungraded
            code: s.code,
            comment: s.comment,
          }))
        )
      )
      .catch(() => setError("Could not load submissions."));
  }, []);

  const viewing = subs.find((x) => x.id === viewingId);
  const grading = subs.find((x) => x.id === gradingId);
  const valid = /^\d{1,3}$/.test(score) && Number(score) >= 1 && Number(score) <= 100;

  const openGrade = (sub) => {
    setScore(sub.grade == null ? "" : String(sub.grade));
    setGradingId(sub.id);
  };
  const submitGrade = async () => {
    if (!valid) return;
    try {
      await post("/api/grade", { id: gradingId, score: Number(score), comment: grading?.comment ?? "" });
      setSubs((xs) => xs.map((x) => (x.id === gradingId ? { ...x, grade: Number(score) } : x)));
      setGradingId(null);
    } catch (e) {
      setError(`Could not save the grade. ${e.message}`);
      setGradingId(null);
    }
  };

  const header = <Header title="Student Submissions" subtitle="View and manage student submissions." />;

  if (viewing) {
    return (
      <>
        {header}
        <main>
          <div className="top">
            <h2 className="bold">Submission Details</h2>
            <button className="btn blue" onClick={() => setViewingId(null)}>Back to List</button>
          </div>
          <div className="detail">
            <div>
              <h2>{viewing.name}</h2>
              <p>{viewing.section}</p>
            </div>
            <pre>{viewing.code}</pre>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main>
        <div className="top">
          <div>
            <h2 className="bold">Welcome to Student Submissions!</h2>
            <p>Submission Lists</p>
          </div>
          <button className="btn" onClick={() => go("home")}>Go back</button>
        </div>

        <div className="list">
          {subs.length === 0 && !error && <p className="empty">No submissions yet.</p>}
          {subs.map((sub) => (
            <div className="card light" key={sub.id}>
              <div>
                <h3>{sub.name}</h3>
                <small>{sub.section}</small>
              </div>
              <div className="actions">
                <button className="btn violet" onClick={() => setViewingId(sub.id)}>View</button>
                <button className="btn blue" onClick={() => openGrade(sub)} style={{ display: "flex", gap: 5, alignItems: "center", justifyContent: "center" }}>
                  {sub.grade != null && <Star />}
                  {sub.grade == null ? "Grade" : `Graded: ${sub.grade}/100`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {grading && (
        <Modal
          title="Grade Submission"
          text={
            <>
              <p>{grading.name}</p>
              <label className="score" style={{ marginTop: 12, justifyContent: "center" }}>
                <input
                  autoFocus
                  inputMode="numeric"
                  aria-label="Score out of 100"
                  placeholder="0"
                  value={score}
                  onChange={(e) => setScore(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && submitGrade()}
                />
                / 100
              </label>
            </>
          }
        >
          <button className="btn teal" disabled={!valid} onClick={submitGrade}>Submit Grade</button>
          <button className="btn grey" onClick={() => setGradingId(null)}>Cancel</button>
        </Modal>
      )}
      {error && (
        <Modal title="Something went wrong" text={error}>
          <button autoFocus className="btn teal" onClick={() => setError("")}>Go Back</button>
        </Modal>
      )}
    </>
  );
}

/* ---------- Shell ---------- */
export default function FacultyPortal() {
  const [view, setView] = useState("home");
  const [questions, setQuestions] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setQuestions(data.map((q) => ({ id: q.id, title: q.question, output: q.expected_output }))))
      .catch(() => {});
  }, []);

  const onDelete = async (id) => {
    try {
      await post("/api/question/delete", { id });
      setQuestions((qs) => qs.filter((q) => q.id !== id));
    } catch {
      /* leave the list unchanged if the server refused */
    }
  };

  return (
    <div className="fp">
      {view === "home" && (
        <Home
          go={setView}
          questions={questions}
          onEdit={(id) => { setEditingId(id); setView("questions"); }}
          onDelete={onDelete}
        />
      )}
      {view === "questions" && (
        <Questions go={setView} questions={questions} setQuestions={setQuestions} editingId={editingId} setEditingId={setEditingId} />
      )}
      {view === "submissions" && <Submissions go={setView} />}
    </div>
  );
}