import { useState, useRef, useEffect } from "react";
import "./Student.css";
import { getAuthBearerToken } from "../api/auth";

const LANGUAGES = ["Java", "PHP", "Python", "C", "C++", "JavaScript", "HTML", "CSS", "C#", "SQL"];

// Keys must match LANGUAGE_MAP in CodingController.java. HTML and CSS have no
// compiler on the backend, so they can't be run (add them there or drop them here).
const BACKEND_KEY = {
  Java: "java", PHP: "php", Python: "python", C: "c", "C++": "c++",
  JavaScript: "javascript", "C#": "c#", SQL: "sql",
};

async function api(apiUrl, path, body) {
  const authToken = getAuthBearerToken();
  if (!authToken) throw new Error("Your sign-in session has expired. Sign in again.");

  const headers = { Authorization: `Bearer ${authToken}` };
  const options = { headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    options.method = "POST";
    options.body = JSON.stringify(body);
  }

  const baseUrl = apiUrl.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/api/meeting-code${path}`, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Server returned ${res.status}`);
  }
  return data;
}

const norm = (t) => (t ?? "").replace(/\r\n/g, "\n").trim();


function Modal({ title, children, actions, firstFocusRef, onClose }) {
  const ref = useRef(null);

  // Focus the safe action on open, trap Tab, close on Esc, restore focus on close
  useEffect(() => {
    const previous = document.activeElement;
    firstFocusRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const btns = [...ref.current.querySelectorAll("button")];
        const i = btns.indexOf(document.activeElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="overlay">
      <div ref={ref} className="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{title}</h2>
        {children}
        <div className="btns">{actions}</div>
      </div>
    </div>
  );
}

export default function StudentCompiler({ apiUrl, classId, blockId, role, displayName }) {
  const hasMeetingContext = Number(classId) > 0 && Number(blockId) > 0;
  const [assigned, setAssigned] = useState(undefined); // undefined = loading, null = none
  const [language, setLanguage] = useState("Java");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState(null); // null = not run yet
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("idle"); // idle -> confirm -> submitted | error
  const goBackConfirm = useRef(null);
  const goBackDone = useRef(null);
  const goBackError = useRef(null);

  useEffect(() => {
    if (!Number.isInteger(Number(classId)) || !Number.isInteger(Number(blockId))) return undefined;

    let active = true;
    const query = new URLSearchParams({ classId: String(classId), blockId: String(blockId) });
    api(apiUrl, `/assignment?${query}`)
      .then((d) => {
        const q = Array.isArray(d) ? d[0] : d;
        if (!active) return;
        setAssigned(q && (q.question ?? q.title)
          ? {
              id: q.id ?? q.question_id,
              title: q.question ?? q.title,
              expected: q.expected_output ?? q.expectedOutput ?? "",
            }
          : null);
        setError("");
      })
      .catch((loadError) => {
        if (!active) return;
        setAssigned(null);
        setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [apiUrl, classId, blockId]);

  const expected = assigned?.expected ?? "";
  let result = null;
  if (output !== null) {
    if (!expected.trim()) result = { text: "No expected output", cls: "" };
    else if (norm(output) === norm(expected)) result = { text: "Passed", cls: "pass" };
    else result = { text: "Failed", cls: "fail" };
  }

  const run = async () => {
    if (!code.trim() || running) return;
    const key = BACKEND_KEY[language];
    if (!key) {
      setOutput(`${language} can't be run by the compiler.`);
      return;
    }
    setError("");
    setRunning(true);
    try {
      const d = await api(apiUrl, "/run", {
        classId: Number(classId),
        blockId: Number(blockId),
        language: key,
        code,
      });
      setOutput(d?.output ?? "");
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setRunning(false);
  };

  const confirmSubmit = async () => {
    setSending(true);
    try {
      await api(apiUrl, "/submit", {
        classId: Number(classId),
        blockId: Number(blockId),
        questionId: assigned.id,
        code,
      });
      setSubmitted(true);
      setStep("submitted");
    } catch (e) {
      setError(e.message);
      setStep("error");
    }
    setSending(false);
  };

  const canSubmit = role === "STUDENT" && !!assigned && !!code.trim() && !submitted;
  const questionText =
    !hasMeetingContext
      ? "Meeting details unavailable"
      : assigned === undefined ? "Loading…" : assigned ? assigned.title : "None assigned yet";

  return (
    <div className="sc sc--meeting">
      <header>
        <div className="brand">
          <svg width="97" height="84" viewBox="0 0 97 84" aria-hidden="true">
            <rect x="3" y="3" width="34" height="34" fill="none" stroke="#D9D0DE" strokeWidth="6" />
            <rect x="3" y="45" width="78" height="34" fill="none" stroke="#D9D0DE" strokeWidth="6" />
          </svg>
          <div>
            <h1>Online Compiler</h1>
            <p>Class {classId} · Section {blockId}</p>
          </div>
        </div>
      </header>

      <main>
        {(error || !hasMeetingContext) && (
          <p className="sc-error" role="alert">
            {error || "Meeting class details are missing. Rejoin the meeting and try again."}
          </p>
        )}
        <div className="question">Assigned Question: {questionText}</div>

        <div className="grid">
          <section aria-label="Code editor">
            <div className="row">
              <div className="lang">
                <label htmlFor="lang">Choose language:</label>
                <select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn" onClick={run} disabled={running || !code.trim()}>{running ? "…" : "Run"}</button>
            </div>
            <div className="panel">
              <h2><label htmlFor="code">Code here:</label></h2>
              <textarea id="code" spellCheck={false} readOnly={submitted} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </section>

          <section aria-label="Results">
            <div className="row">
              <span className="sc-user">{displayName || "Signed-in participant"}</span>
              {role === "STUDENT" ? (
                <button type="button" className="btn" disabled={!canSubmit} onClick={() => setStep("confirm")}>Submit</button>
              ) : (
                <span className="sc-hint">Only students can submit.</span>
              )}
            </div>
            <div className="panel"><h2>Output:</h2><pre aria-live="polite">{output}</pre></div>
            <div className="panel"><h2>Expected output:</h2><pre>{expected}</pre></div>
            <div className="panel short"><h2 className="res">Result:{result && <span className={result.cls}>{result.text}</span>}</h2><pre /></div>
          </section>
        </div>
      </main>

      {step === "confirm" && (
        <Modal
          title="Are you sure?"
          firstFocusRef={goBackConfirm}
          onClose={() => setStep("idle")}
          actions={
            <>
              <button type="button" className="btn red" disabled={sending} onClick={confirmSubmit}>{sending ? "…" : "Yes"}</button>
              <button type="button" className="btn teal" ref={goBackConfirm} onClick={() => setStep("idle")}>Go Back</button>
            </>
          }
        >
          <p>This submission can’t be edited!</p>
        </Modal>
      )}

      {step === "submitted" && (
        <Modal
          title="Submitted!"
          firstFocusRef={goBackDone}
          onClose={() => setStep("idle")}
          actions={
            <button type="button" className="btn teal" ref={goBackDone} onClick={() => setStep("idle")}>Go Back</button>
          }
        />
      )}

      {step === "error" && (
        <Modal
          title="Could not submit"
          firstFocusRef={goBackError}
          onClose={() => setStep("idle")}
          actions={
            <button type="button" className="btn teal" ref={goBackError} onClick={() => setStep("idle")}>Go Back</button>
          }
        >
          <p>{error}</p>
        </Modal>
      )}
    </div>
  );
}
