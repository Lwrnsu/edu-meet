import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  LiveKitRoom,
  Chat,
} from "@livekit/components-react";
import "@livekit/components-styles";
import "./meeting.css";
import { getAuthBearerToken } from "../api/auth";
import StudentCompiler from "../compilerfrontend/Student.jsx";
import { recordPreviousMeeting } from "./classMeetingsStore";
import MainMeeting from "./MainMeeting.jsx";

export default function VideoRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => location.state?.token ?? "");
  const [meetingContext, setMeetingContext] = useState(
    () => location.state?.meetingContext ?? null,
  );
  const [prejoin] = useState(() => location.state?.prejoin ?? {});
  const [error, setError] = useState("");
  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const apiUrl = import.meta.env.DEV ? import.meta.env.VITE_API_URL ?? "" : "";

  useEffect(() => {
    if (!token) {
      navigate("/lobby", { replace: true });
      return;
    }
    if (meetingContext?.classId && meetingContext?.blockId) {
      recordPreviousMeeting({
        classId: meetingContext.classId,
        blockId: meetingContext.blockId,
        subject: meetingContext.subject,
        section: meetingContext.section,
      });
    }
  }, [token, meetingContext, navigate]);

  useEffect(() => {
    if (location.state?.token) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  if (!token) {
    return null;
  }

  const videoOptions = prejoin.cameraOn
    ? prejoin.cameraDeviceId
      ? { deviceId: { exact: prejoin.cameraDeviceId } }
      : true
    : false;
  const audioOptions = prejoin.micOn
    ? prejoin.micDeviceId
      ? { deviceId: { exact: prejoin.micDeviceId } }
      : true
    : false;

  return (
    <LiveKitRoom
      video={videoOptions}
      audio={audioOptions}
      token={token}
      serverUrl={meetingContext?.url || liveKitUrl}
      data-lk-theme="default"
      style={{ height: "100vh" }}
      onError={(roomError) => {
        console.error("LiveKit connection error:", roomError);
        const message = roomError.message || "An unexpected LiveKit error occurred.";
        const mediaPermissionDenied =
          roomError.name === "NotAllowedError" || /permission denied/i.test(message);
        setError(
          mediaPermissionDenied
            ? "Camera or microphone access was denied. Allow access for this site in your browser settings, then try again."
            : `LiveKit connection error: ${message}`,
        );
      }}
      onDisconnected={() => {
        setToken("");
        setMeetingContext(null);
        navigate("/lobby", { replace: true });
      }}
    >
      {error && (
        <div role="alert" style={{ position: "fixed", top: 12, left: 12, zIndex: 100, background: "#fff", color: "#b91c1c", padding: 12, borderRadius: 8 }}>
          {error}
        </div>
      )}
      <MeetingLayout
        apiUrl={apiUrl}
        meetingContext={meetingContext}
        initialDevices={prejoin}
        onEndCall={() => {
          setToken("");
          setMeetingContext(null);
          navigate("/lobby", { replace: true });
        }}
      />
    </LiveKitRoom>
  );
}

function MeetingLayout({ apiUrl, meetingContext, initialDevices, onEndCall }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("menu");
  const [admissionRequests, setAdmissionRequests] = useState([]);
  const [admissionError, setAdmissionError] = useState("");
  const [decidingRequestId, setDecidingRequestId] = useState("");
  const role = meetingContext?.role;
  const isFaculty = role === "FACULTY";
  const toolTitles = {
    menu: "Meeting tools",
    messages: "Messages",
    admissionRequests: "Admission requests",
    codeEditor: "Code Editor",
    quizExam: "Quiz / Exam",
  };

  useEffect(() => {
    if (!isFaculty) return undefined;
    let active = true;
    const loadRequests = async () => {
      try {
        const authToken = getAuthBearerToken();
        const response = await fetch(`${apiUrl}/api/room/admission-requests`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.message || data.error || "Could not load admission requests.");
        }
        if (active) {
          setAdmissionRequests(Array.isArray(data) ? data : []);
          setAdmissionError("");
        }
      } catch (loadError) {
        if (active) setAdmissionError(loadError.message);
      }
    };
    loadRequests();
    const timer = setInterval(loadRequests, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [apiUrl, isFaculty]);

  const decideAdmission = async (requestId, approved) => {
    setDecidingRequestId(requestId);
    setAdmissionError("");
    try {
      const authToken = getAuthBearerToken();
      const response = await fetch(
        `${apiUrl}/api/room/admission-requests/${encodeURIComponent(requestId)}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ approved }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Could not update the admission request.");
      }
      setAdmissionRequests((requests) =>
        requests.filter((request) => request.requestId !== requestId),
      );
    } catch (decisionError) {
      setAdmissionError(decisionError.message);
    } finally {
      setDecidingRequestId("");
    }
  };

  return (
    <MainMeeting
      meetingContext={meetingContext}
      initialDevices={initialDevices}
      toolsOpen={toolsOpen}
      onToggleTools={() => {
        setActiveTool("menu");
        setToolsOpen((open) => !open);
      }}
      onEndCall={onEndCall}
    >
      {toolsOpen && (
        <aside
          id="meeting-tools-panel"
          className={`meeting-tools-panel${activeTool === "codeEditor" ? " meeting-tools-panel--code" : ""}`}
          aria-label="Meeting tools"
        >
          <header className="meeting-tools-header">
            {activeTool !== "menu" && (
              <button
                type="button"
                className="meeting-tools-back"
                onClick={() => setActiveTool("menu")}
              >
                Back
              </button>
            )}
            <h2>{toolTitles[activeTool]}</h2>
            <button
              type="button"
              className="meeting-tools-close"
              onClick={() => setToolsOpen(false)}
            >
              Close
            </button>
          </header>

          {activeTool === "menu" && (
            <nav className="meeting-tools-menu" aria-label="Meeting tools">
              <button type="button" onClick={() => setActiveTool("messages")}>
                Messages
              </button>
              {isFaculty && (
                <button type="button" onClick={() => setActiveTool("admissionRequests")}>
                  Admission requests ({admissionRequests.length})
                </button>
              )}
              <button type="button" onClick={() => setActiveTool("codeEditor")}>
                Code Editor
              </button>
              <button type="button" onClick={() => setActiveTool("quizExam")}>
                Quiz / Exam
                <span>Coming later</span>
              </button>
            </nav>
          )}

          {activeTool === "messages" && <Chat />}
          {activeTool === "admissionRequests" && isFaculty && (
            <div className="meeting-tool-placeholder">
              {admissionError && <p role="alert">{admissionError}</p>}
              {admissionRequests.length === 0 ? (
                <p>No pending requests.</p>
              ) : (
                admissionRequests.map((request) => (
                  <article key={request.requestId}>
                    <p>
                      {request.requesterName || `User ${request.requesterId}`} requested to join
                      class {request.classId}, block {request.blockId}.
                    </p>
                    <button
                      type="button"
                      disabled={decidingRequestId === request.requestId}
                      onClick={() => decideAdmission(request.requestId, true)}
                    >
                      Admit
                    </button>
                    <button
                      type="button"
                      disabled={decidingRequestId === request.requestId}
                      onClick={() => decideAdmission(request.requestId, false)}
                    >
                      Deny
                    </button>
                  </article>
                ))
              )}
            </div>
          )}
          {activeTool === "codeEditor" && (
            <StudentCompiler
              key={`${meetingContext?.classId}:${meetingContext?.blockId}`}
              apiUrl={apiUrl}
              classId={meetingContext?.classId}
              blockId={meetingContext?.blockId}
              role={role}
              displayName={meetingContext?.name}
            />
          )}
          {activeTool === "quizExam" && (
            <div className="meeting-tool-placeholder">
              <p>Quiz and exam tools will be added later.</p>
            </div>
          )}
        </aside>
      )}
    </MainMeeting>
  );
}
