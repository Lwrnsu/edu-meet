import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { getAuthBearerToken } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";
import { saveCreatedClass } from "./classMeetingsStore";
import "./join.css";

const apiUrl = import.meta.env.DEV ? import.meta.env.VITE_API_URL ?? "" : "";

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem("edu_meet_cached_user") || "null");
  } catch {
    return null;
  }
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : (words[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function getDisplayName(user) {
  return (
    user?.display_name ||
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Edu-Meet user"
  );
}

function combinePreviewStreams(cameraStream, microphoneStream) {
  const tracks = [
    ...(cameraStream?.getVideoTracks() || []),
    ...(microphoneStream?.getAudioTracks() || []),
  ].filter((track) => track.readyState === "live");
  return tracks.length ? new MediaStream(tracks) : null;
}

function getMediaErrorMessage(mediaError, deviceLabel) {
  if (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError") {
    return `Allow ${deviceLabel.toLowerCase()} access in your browser, then try again.`;
  }
  if (mediaError.name === "NotFoundError" || mediaError.name === "OverconstrainedError") {
    return `The selected ${deviceLabel.toLowerCase()} is unavailable. Choose another device and try again.`;
  }
  return mediaError.message || `Could not access the selected ${deviceLabel.toLowerCase()}.`;
}

function MicIcon({ muted = false }) {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {muted ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M9 9v3a3 3 0 004.7 2.5M15 9.3V11a3 3 0 01-.5 1.7" />
          <path d="M19 11v1a7 7 0 01-10.7 5.9M5 12v0a7 7 0 001.1 3.8M12 19v3M8 22h8" />
        </>
      ) : (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" />
        </>
      )}
    </svg>
  );
}

function CameraIcon({ muted = false }) {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {muted ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.7 6H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 001.7-.9M17 9l4-3v12l-2.4-1.8" />
        </>
      ) : (
        <>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="M16 10l5-3v10l-5-3z" />
        </>
      )}
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function DeviceSelector({ device, selectedDeviceId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="join-page__device-card">
      <button
        type="button"
        className="join-page__device-trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {device.kind === "audioinput" ? (
          <MicIcon />
        ) : device.kind === "audiooutput" ? (
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="11" width="4" height="8" rx="1" />
            <path d="M8 13l8-4v6l-8-4v2" />
          </svg>
        ) : (
          <CameraIcon />
        )}
        <span className="join-page__device-label">
          {device.options.find((option) => option.deviceId === selectedDeviceId)?.label || device.defaultLabel}
        </span>
      </button>
      <span className="join-page__device-divider" aria-hidden="true" />
      <button
        type="button"
        className="join-page__device-chevron"
        aria-label={`Open ${device.label} options`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <ChevronIcon />
      </button>
      {isOpen && (
        <div className="join-page__device-menu" role="listbox" aria-label={`${device.label} options`}>
          {device.options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.deviceId === selectedDeviceId}
              className={`join-page__device-option ${
                option.deviceId === selectedDeviceId ? "join-page__device-option--selected" : ""
              }`}
              key={option.deviceId}
              onClick={() => {
                onSelect(option.deviceId);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Join() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authenticatedUser } = useAuth();
  const [cachedUser] = useState(getCachedUser);
  const user = authenticatedUser || cachedUser;
  const displayName = getDisplayName(user);
  const email = user?.email || "";

  const initialClassId = String(location.state?.classId ?? "");
  const initialBlockId = String(location.state?.blockId ?? "");
  const [classId, setClassId] = useState(initialClassId);
  const [blockId, setBlockId] = useState(initialBlockId);
  const [classOptions, setClassOptions] = useState([]);
  const [classOptionsError, setClassOptionsError] = useState("");
  const [error, setError] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [admissionRequest, setAdmissionRequest] = useState(null);
  const [isRequestingAdmission, setIsRequestingAdmission] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraDeviceId, setCameraDeviceId] = useState("");
  const [micDeviceId, setMicDeviceId] = useState("");
  const [speakerDeviceId, setSpeakerDeviceId] = useState("");
  const [devices, setDevices] = useState({
    cameras: [],
    microphones: [],
    speakers: [],
  });
  const [previewStream, setPreviewStream] = useState(null);
  const previewVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const requestMeetingTokenRef = useRef(null);

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
  }, []);

  useEffect(() => {
    let active = true;

    const refreshDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        if (!active) return;
        const cameras = mediaDevices
          .filter((mediaDevice) => mediaDevice.kind === "videoinput")
          .map((mediaDevice, index) => ({
            deviceId: mediaDevice.deviceId,
            label: mediaDevice.label || `Camera ${index + 1}`,
          }));
        const microphones = mediaDevices
          .filter((mediaDevice) => mediaDevice.kind === "audioinput")
          .map((mediaDevice, index) => ({
            deviceId: mediaDevice.deviceId,
            label: mediaDevice.label || `Microphone ${index + 1}`,
          }));
        const speakers = mediaDevices
          .filter((mediaDevice) => mediaDevice.kind === "audiooutput")
          .map((mediaDevice, index) => ({
            deviceId: mediaDevice.deviceId,
            label: mediaDevice.label || `Speaker ${index + 1}`,
          }));
        setDevices({ cameras, microphones, speakers });
        setCameraDeviceId((current) => current || cameras[0]?.deviceId || "");
        setMicDeviceId((current) => current || microphones[0]?.deviceId || "");
        setSpeakerDeviceId((current) => current || speakers[0]?.deviceId || "");
      } catch (deviceError) {
        if (active) {
          setMediaError(deviceError.message || "Could not enumerate media devices.");
        }
      }
    };

    refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => {
      active = false;
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let nextStream = null;

    const updateCameraPreview = async () => {
      if (!cameraOn) {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        setPreviewStream(combinePreviewStreams(null, microphoneStreamRef.current));
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("Camera access requires HTTPS or localhost in a supported browser.");
        setCameraOn(false);
        return;
      }

      try {
        nextStream = await navigator.mediaDevices.getUserMedia({
          video: cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : true,
          audio: false,
        });
        if (nextStream.getVideoTracks().length === 0) {
          throw new Error("The browser did not provide a camera track.");
        }
        if (!active) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = nextStream;
        setPreviewStream(combinePreviewStreams(cameraStreamRef.current, microphoneStreamRef.current));
        setMediaError("");
      } catch (mediaError) {
        if (active) {
          setMediaError(getMediaErrorMessage(mediaError, "Camera"));
          setCameraOn(false);
        }
      }
    };

    updateCameraPreview();
    return () => {
      active = false;
      nextStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOn, cameraDeviceId]);

  useEffect(() => {
    let active = true;
    let nextStream = null;

    const updateMicrophonePreview = async () => {
      if (!micOn) {
        microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
        microphoneStreamRef.current = null;
        setPreviewStream(combinePreviewStreams(cameraStreamRef.current, null));
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("Microphone access requires HTTPS or localhost in a supported browser.");
        setMicOn(false);
        return;
      }

      try {
        nextStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
        });
        if (nextStream.getAudioTracks().length === 0) {
          throw new Error("The browser did not provide a microphone track.");
        }
        if (!active) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
        microphoneStreamRef.current = nextStream;
        setPreviewStream(combinePreviewStreams(cameraStreamRef.current, microphoneStreamRef.current));
        setMediaError("");
      } catch (mediaError) {
        if (active) {
          setMediaError(getMediaErrorMessage(mediaError, "Microphone"));
          setMicOn(false);
        }
      }
    };

    updateMicrophonePreview();
    return () => {
      active = false;
      nextStream?.getTracks().forEach((track) => track.stop());
    };
  }, [micOn, micDeviceId]);

  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    microphoneStreamRef.current = null;
  }, []);

  useEffect(() => {
    const requestId = admissionRequest?.requestId;
    if (!requestId || !["PENDING", "APPROVED"].includes(admissionRequest.status)) {
      return undefined;
    }

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
            currentRequest.message || currentRequest.error || "Admission status check failed.",
          );
        }
        if (!active) return;

        if (currentRequest.status === "APPROVED") {
          await requestMeetingTokenRef.current(requestId);
          return;
        }
        if (currentRequest.status === "DENIED") {
          setAdmissionRequest(currentRequest);
          setError("The assigned faculty member denied your admission request.");
          return;
        }
        setAdmissionRequest(currentRequest);
        timer = window.setTimeout(checkRequest, 3000);
      } catch (pollError) {
        if (active) {
          setError(pollError.message);
          timer = window.setTimeout(checkRequest, 3000);
        }
      }
    };

    timer = window.setTimeout(checkRequest, 3000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [admissionRequest?.requestId, admissionRequest?.status]);

  const getSelectedOption = () => {
    const numericClassId = Number(classId);
    const numericBlockId = Number(blockId);
    return classOptions.find(
      (option) =>
        Number(option.classId) === numericClassId &&
        Number(option.blockId) === numericBlockId,
    );
  };

  const requestMeetingToken = async (admissionRequestId = null) => {
    const numericClassId = Number(classId);
    const numericBlockId = Number(blockId);
    if (!Number.isInteger(numericClassId) || numericClassId <= 0 ||
        !Number.isInteger(numericBlockId) || numericBlockId <= 0) {
      throw new Error("Enter a valid class ID and block/section ID.");
    }

    const authToken = getAuthBearerToken();
    if (!authToken) throw new Error("Sign in before joining a meeting.");

    const response = await fetch(`${apiUrl}/api/room/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        classId: numericClassId,
        blockId: numericBlockId,
        admissionRequestId,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error(
        "This account is not authorized for that class section. Verify the class and block IDs, confirm enrollment, or request faculty admission.",
      );
    }
    if (!response.ok) {
      throw new Error(data.message || data.error || `Token request failed (${response.status}).`);
    }
    if (!data.token) throw new Error("The backend response did not contain a token.");
    if (!(data.url || import.meta.env.VITE_LIVEKIT_URL)) {
      throw new Error("Set LIVEKIT_URL for the backend or VITE_LIVEKIT_URL for the frontend.");
    }

    const option = getSelectedOption();
    const meeting = {
      classId: numericClassId,
      blockId: numericBlockId,
      subject: data.subject || option?.subject || `Class ${numericClassId}`,
      section: data.section || option?.section || `Block ${numericBlockId}`,
    };
    saveCreatedClass(meeting);
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    microphoneStreamRef.current = null;
    setPreviewStream(null);
    navigate("/video-room", {
      state: {
        token: data.token,
        meetingContext: data,
        prejoin: {
          cameraOn,
          micOn,
          cameraDeviceId,
          micDeviceId,
          speakerDeviceId,
        },
      },
    });
  };
  useEffect(() => {
    requestMeetingTokenRef.current = requestMeetingToken;
  });

  const handleJoin = async (event) => {
    event?.preventDefault?.();
    setError("");
    setAdmissionRequest(null);
    setIsJoining(true);
    try {
      await requestMeetingToken();
    } catch (joinError) {
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
      const numericClassId = Number(classId);
      const numericBlockId = Number(blockId);
      const authToken = getAuthBearerToken();
      const response = await fetch(`${apiUrl}/api/room/admission-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ classId: numericClassId, blockId: numericBlockId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Admission request failed.");
      }
      setAdmissionRequest(data);
    } catch (requestError) {
      setError(requestError.message || "Could not request admission.");
    } finally {
      setIsRequestingAdmission(false);
    }
  };

  const cameraDevices = {
    kind: "videoinput",
    label: "Camera",
    defaultLabel: "Camera",
    options: devices.cameras.length
      ? devices.cameras
      : [{ deviceId: "", label: "Default Camera" }],
  };
  const microphoneDevices = {
    kind: "audioinput",
    label: "Microphone",
    defaultLabel: "Microphone",
    options: devices.microphones.length
      ? devices.microphones
      : [{ deviceId: "", label: "Default Microphone" }],
  };
  const speakerDevices = {
    kind: "audiooutput",
    label: "Speaker",
    defaultLabel: "Speaker",
    options: devices.speakers.length
      ? devices.speakers
      : [{ deviceId: "", label: "Default Speaker" }],
  };

  return (
    <main className="join-page">
      <div className="join-page__container">
        <header className="join-page__header">
          <button type="button" className="join-page__brand-button" onClick={() => navigate("/lobby")}>
            <img className="join-page__logo" alt="Edu-Meet logo" src="/src/assets/brand/edu-meet-logo.png" />
            <h1 className="join-page__title">EDU-MEET</h1>
          </button>
          <div className="join-page__user">
            <div className="join-page__user-meta">
              <p className="join-page__user-email">{email}</p>
              <p className="join-page__user-name">{displayName}</p>
            </div>
            <span className="join-page__avatar" aria-label={`${displayName} profile`}>
              {getInitials(displayName)}
            </span>
          </div>
        </header>

        <section className="join-page__feedback" aria-label="Class selection">
            <label htmlFor="join-class-select">Choose a class section</label>
            <select
              id="join-class-select"
              value={classId && blockId ? `${classId}:${blockId}` : ""}
              onChange={(event) => {
                const [selectedClassId, selectedBlockId] = event.target.value.split(":");
                setClassId(selectedClassId || "");
                setBlockId(selectedBlockId || "");
              }}
              style={{ width: "100%", marginTop: "10px", padding: "10px", borderRadius: "10px" }}
            >
              <option value="">Select a class section</option>
              {classOptions.map((option) => (
                <option key={`${option.classId}:${option.blockId}`} value={`${option.classId}:${option.blockId}`}>
                  {option.subject} — {option.section} (class {option.classId}, block {option.blockId})
                </option>
              ))}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
              <label htmlFor="join-class-id">
                <span style={{ display: "block", marginBottom: "6px" }}>Class ID</span>
                <input
                  id="join-class-id"
                  type="number"
                  min="1"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#fff" }}
                />
              </label>
              <label htmlFor="join-block-id">
                <span style={{ display: "block", marginBottom: "6px" }}>Block / Section ID</span>
                <input
                  id="join-block-id"
                  type="number"
                  min="1"
                  value={blockId}
                  onChange={(event) => setBlockId(event.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#fff" }}
                />
              </label>
            </div>
        </section>

        {classOptionsError && (
          <p className="join-page__feedback" role="status">
            Could not load your assigned classes: {classOptionsError}. You can still enter the IDs.
          </p>
        )}

        <section className="join-page__preview" aria-label="Meeting preview">
          {cameraOn ? (
            <video ref={previewVideoRef} className="join-page__video" autoPlay muted playsInline />
          ) : (
            <p className="join-page__camera-off">Camera is off</p>
          )}
          <div className="join-page__preview-badge">
            {micOn ? "Microphone on" : "Microphone off"}
          </div>
          <div className="join-page__preview-controls">
            <button
              type="button"
              className={`join-page__media-btn ${micOn ? "join-page__media-btn--active" : ""}`}
              aria-label={micOn ? "Turn microphone off" : "Turn microphone on"}
              aria-pressed={micOn}
              onClick={() => setMicOn((current) => !current)}
            >
              <MicIcon muted={!micOn} />
            </button>
            <button
              type="button"
              className={`join-page__media-btn ${cameraOn ? "join-page__media-btn--active" : ""}`}
              aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
              aria-pressed={cameraOn}
              onClick={() => setCameraOn((current) => !current)}
            >
              <CameraIcon muted={!cameraOn} />
            </button>
          </div>
        </section>

        <section className="join-page__devices" aria-label="Meeting devices">
          <DeviceSelector
            device={cameraDevices}
            selectedDeviceId={cameraDeviceId}
            onSelect={setCameraDeviceId}
          />
          <DeviceSelector
            device={microphoneDevices}
            selectedDeviceId={micDeviceId}
            onSelect={setMicDeviceId}
          />
          <DeviceSelector
            device={speakerDevices}
            selectedDeviceId={speakerDeviceId}
            onSelect={setSpeakerDeviceId}
          />
        </section>

        {error && (
          <p className="join-page__feedback join-page__feedback--error" role="alert">
            {error}
          </p>
        )}
        {mediaError && (
          <p className="join-page__feedback join-page__feedback--error" role="alert">
            {mediaError}
          </p>
        )}
        {admissionRequest && (
          <p className="join-page__feedback" role="status">
            Admission status: {admissionRequest.status}
          </p>
        )}

        <div className="join-page__actions">
          <button
            type="button"
            className="join-page__join-btn"
            disabled={isJoining || admissionRequest?.status === "PENDING"}
            onClick={handleJoin}
          >
            <span className="join-page__join-btn-text">
              {isJoining ? "Joining..." : "Join Meeting"}
            </span>
          </button>
          {error && (!admissionRequest || admissionRequest.status === "DENIED") && (
            <button
              type="button"
              className="join-page__admission-btn"
              disabled={isRequestingAdmission || isJoining || !classId || !blockId}
              onClick={handleAdmissionRequest}
            >
              {isRequestingAdmission ? "Requesting..." : "Request faculty admission"}
            </button>
          )}
          <button type="button" className="join-page__back-link" onClick={() => navigate("/lobby")}>
            Back to Lobby
          </button>
        </div>
      </div>
    </main>
  );
}
