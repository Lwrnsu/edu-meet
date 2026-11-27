import React, { useEffect, useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  Chat,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import "./meeting.css";
import { getAuthBearerToken } from "../api/auth";

export default function VideoRoom() {
  const [classId, setClassId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [classOptions, setClassOptions] = useState([]);
  const [token, setToken] = useState("");
  const [meetingContext, setMeetingContext] = useState(null);
  const [error, setError] = useState("");
  const [classOptionsError, setClassOptionsError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [admissionRequest, setAdmissionRequest] = useState(null);
  const [isRequestingAdmission, setIsRequestingAdmission] = useState(false);
  const hasPendingAdmission = admissionRequest?.status === "PENDING";
  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

  useEffect(() => {
    const authToken = getAuthBearerToken();
    if (!authToken) return undefined;

    let active = true;
    fetch(`${apiUrl}/api/room/classes`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.message || data.error || "Could not load your class sections.");
        }
        if (active) setClassOptions(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => {
        if (active) setClassOptionsError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [apiUrl]);

  useEffect(() => {
    const requestId = admissionRequest?.requestId;
    const requestStatus = admissionRequest?.status;
    if (!requestId || !["PENDING", "APPROVED"].includes(requestStatus)) return undefined;

    let active = true;
    let timer;
    const checkRequest = async () => {
      try {
        const authToken = getAuthBearerToken();
        const response = await fetch(
          `${apiUrl}/api/room/admission-requests/${encodeURIComponent(requestId)}`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );
        const currentRequest = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            currentRequest.message ||
              currentRequest.error ||
              `Admission status check failed (${response.status})`,
          );
        }
        if (!active) return;

        if (currentRequest.status === "APPROVED") {
          const tokenResponse = await fetch(`${apiUrl}/api/room/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              classId: Number(currentRequest.classId),
              blockId: Number(currentRequest.blockId),
              admissionRequestId: requestId,
            }),
          });
          const tokenData = await tokenResponse.json().catch(() => ({}));
          if (!tokenResponse.ok) {
            throw new Error(
              tokenData.message || tokenData.error || "The approved request could not be used.",
            );
          }
          if (!tokenData.token) throw new Error("The backend response did not contain a token.");
          if (!(tokenData.url || liveKitUrl)) {
            throw new Error("Set LIVEKIT_URL for the backend or VITE_LIVEKIT_URL for the frontend.");
          }
          if (active) {
            setMeetingContext(tokenData);
            setToken(tokenData.token);
            setAdmissionRequest(null);
          }
          return;
        }
        if (currentRequest.status === "DENIED") {
          setAdmissionRequest(currentRequest);
          setError("The assigned faculty member denied your admission request.");
          return;
        }
        setAdmissionRequest(currentRequest);
        timer = setTimeout(checkRequest, 3000);
      } catch (pollError) {
        if (active) {
          setError(pollError.message);
          timer = setTimeout(checkRequest, 3000);
        }
      }
    };

    timer = setTimeout(checkRequest, 3000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [admissionRequest?.requestId, admissionRequest?.status, apiUrl, liveKitUrl]);

  const requestMeetingToken = async (admissionRequestId = null) => {
    const authToken = getAuthBearerToken();
    if (!authToken) throw new Error("Sign in before joining a meeting.");

    const response = await fetch(`${apiUrl}/api/room/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        classId: Number(classId),
        blockId: Number(blockId),
        admissionRequestId,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const requestError = new Error(
        data.message || data.error || `Token request failed (${response.status})`,
      );
      requestError.status = response.status;
      throw requestError;
    }
    if (!data.token) throw new Error("The backend response did not contain a token.");
    if (!(data.url || liveKitUrl)) {
      throw new Error("Set LIVEKIT_URL for the backend or VITE_LIVEKIT_URL for the frontend.");
    }
    setMeetingContext(data);
    setToken(data.token);
    setError("");
    setAdmissionRequest(null);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    setError("");
    setAdmissionRequest(null);
    if (!Number.isInteger(Number(classId)) || Number(classId) <= 0 ||
        !Number.isInteger(Number(blockId)) || Number(blockId) <= 0) {
      setError("Enter a valid class ID and block/section ID.");
      return;
    }

    setIsJoining(true);
    try {
      await requestMeetingToken();
    } catch (joinError) {
      console.error("Error fetching token:", joinError);
      setError(joinError.message || "Could not join the meeting.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleAdmissionRequest = async () => {
    setError("");
    setAdmissionRequest(null);
    setIsRequestingAdmission(true);
    try {
      const authToken = getAuthBearerToken();
      const response = await fetch(`${apiUrl}/api/room/admission-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ classId: Number(classId), blockId: Number(blockId) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.message || data.error || `Admission request failed (${response.status})`,
        );
      }
      setAdmissionRequest(data);
    } catch (requestError) {
      setError(requestError.message || "Could not request admission.");
    } finally {
      setIsRequestingAdmission(false);
    }
  };

  if (!token) {
    return (
      <div
        style={{
          padding: "40px",
          maxWidth: "400px",
          margin: "auto",
          fontFamily: "sans-serif",
        }}
      >
        <h2>Join Classroom</h2>
        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: "12px" }}>
            <label
              htmlFor="meeting-class-section"
              style={{ display: "block", marginBottom: "4px" }}
            >
              Your classes and sections:
            </label>
            <select
              id="meeting-class-section"
              value={classId && blockId ? `${classId}:${blockId}` : ""}
              disabled={hasPendingAdmission}
              onChange={(event) => {
                if (!event.target.value) return;
                const [selectedClassId, selectedBlockId] = event.target.value.split(":");
                setClassId(selectedClassId);
                setBlockId(selectedBlockId);
              }}
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="">Select a class section, or enter its IDs below</option>
              {classOptions.map((option) => (
                <option
                  key={`${option.classId}:${option.blockId}`}
                  value={`${option.classId}:${option.blockId}`}
                >
                  {option.subject} — {option.section} (class {option.classId}, block {option.blockId})
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label htmlFor="meeting-class-id" style={{ display: "block", marginBottom: "4px" }}>
              Class ID
            </label>
            <input
              id="meeting-class-id"
              type="number"
              min="1"
              value={classId}
              disabled={hasPendingAdmission}
              onChange={(event) => setClassId(event.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label htmlFor="meeting-block-id" style={{ display: "block", marginBottom: "4px" }}>
              Block / section ID
            </label>
            <input
              id="meeting-block-id"
              type="number"
              min="1"
              value={blockId}
              disabled={hasPendingAdmission}
              onChange={(event) => setBlockId(event.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          {classOptionsError && (
            <p role="status" style={{ color: "#8a5a00" }}>
              Could not load your classes: {classOptionsError}. You can still enter the IDs directly.
            </p>
          )}
          {error && (
            <p role="alert" style={{ color: "red" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isJoining || hasPendingAdmission}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            {isJoining ? "Joining..." : "Join Call"}
          </button>
        </form>
        {error && (!admissionRequest || admissionRequest.status === "DENIED") && (
          <button
            type="button"
            disabled={isRequestingAdmission || isJoining || !classId || !blockId}
            onClick={handleAdmissionRequest}
            style={{ marginTop: "12px", padding: "10px 16px", cursor: "pointer" }}
          >
            {isRequestingAdmission ? "Requesting..." : "Request faculty admission"}
          </button>
        )}
        {admissionRequest && (
          <p role="status">
            Admission status: {admissionRequest.status}
            {admissionRequest.status === "PENDING" &&
              (admissionRequest.facultyPresent
                ? ". Faculty is currently in the room; waiting for a decision."
                : ". Your request is queued until the assigned faculty reviews it.")}
          </p>
        )}
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={meetingContext?.url || liveKitUrl}
      data-lk-theme="default"
      style={{ height: "100vh" }}
      onError={(roomError) => {
        console.error("LiveKit connection error:", roomError);
        setError(`LiveKit connection error: ${roomError.message}`);
      }}
      onDisconnected={() => {
        setToken("");
        setMeetingContext(null);
        setError(
          "Disconnected from the room. Check the LiveKit URL and network connection, then try again.",
        );
      }}
    >
      <MeetingLayout
        apiUrl={apiUrl}
        role={meetingContext?.role}
      />
    </LiveKitRoom>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} style={{ height: "calc(100vh - 80px)" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function MeetingLayout({ apiUrl, role }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("menu");
  const [admissionRequests, setAdmissionRequests] = useState([]);
  const [admissionError, setAdmissionError] = useState("");
  const [decidingRequestId, setDecidingRequestId] = useState("");
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
    <div className="meeting-layout">
      <div className="meeting-main">
        <div className="meeting-grid">
          <MyVideoConference />
        </div>
        <div className="meeting-controls">
          <ControlBar />
          <button
            type="button"
            className="meeting-tools-toggle"
            aria-label={
              admissionRequests.length > 0
                ? `${admissionRequests.length} pending admission requests`
                : toolsOpen
                  ? "Close meeting tools"
                  : "Open meeting tools"
            }
            aria-expanded={toolsOpen}
            aria-controls="meeting-tools-panel"
            onClick={() => {
              setActiveTool("menu");
              setToolsOpen((open) => !open);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {isFaculty && admissionRequests.length > 0 && (
              <span>{admissionRequests.length} pending</span>
            )}
          </button>
        </div>
      </div>

      {toolsOpen && (
        <aside
          id="meeting-tools-panel"
          className="meeting-tools-panel"
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
                <span>Coming later</span>
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
            <div className="meeting-tool-placeholder">
              <p>The code editor will be added later.</p>
            </div>
          )}
          {activeTool === "quizExam" && (
            <div className="meeting-tool-placeholder">
              <p>Quiz and exam tools will be added later.</p>
            </div>
          )}
        </aside>
      )}

      <RoomAudioRenderer />
    </div>
  );
}
