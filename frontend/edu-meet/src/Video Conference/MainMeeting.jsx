import { useCallback, useEffect, useState } from "react";
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "./MainMeeting.css";

function Icon({ name, size = 26 }) {
  const common = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "camera") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="12" height="12" rx="2" />
        <path d="m15 10 6-3v10l-6-3" />
      </svg>
    );
  }
  if (name === "microphone") {
    return (
      <svg {...common}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
      </svg>
    );
  }
  if (name === "speaker") {
    return (
      <svg {...common}>
        <path d="M4 10v4h4l5 4V6l-5 4H4z" />
        <path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11" />
      </svg>
    );
  }
  if (name === "screen") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (name === "tools") {
    return (
      <svg {...common}>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  }
  if (name === "leave") {
    return (
      <svg {...common}>
        <path d="M4.5 5.5c0 7.7 6.3 14 14 14h1v-4.2l-4.4-1.1-1.7 2.2a12.1 12.1 0 0 1-5.8-5.8l2.2-1.7-1.1-4.4H4.5z" />
        <path d="m15 8 5 5m0-5-5 5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DeviceSelector({
  label,
  kind,
  options,
  selectedDeviceId,
  onSelect,
  loading,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.deviceId === selectedDeviceId);
  const selectedLabel = selected?.label || options[0]?.label || `No ${label.toLowerCase()} detected`;
  const disabled = loading || options.length === 0;

  return (
    <div className={`main-meeting__device${compact ? " main-meeting__device--compact" : ""}`}>
      <button
        type="button"
        className={`main-meeting__device-trigger${compact ? " main-meeting__device-trigger--compact" : ""}`}
        aria-label={`Open ${label.toLowerCase()} options. Current device: ${selectedLabel}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={`${label}: ${selectedLabel}`}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        {compact ? (
          kind === "speaker" ? (
            <>
              <Icon name="speaker" size={20} />
              <Icon name="chevron" size={16} />
            </>
          ) : (
            <Icon name="chevron" size={20} />
          )
        ) : (
          <>
            <Icon name={kind === "speaker" ? "speaker" : kind} />
            <span className="main-meeting__device-name">{selectedLabel}</span>
            <Icon name="chevron" />
          </>
        )}
      </button>
      {isOpen && options.length > 0 && (
        <div
          className={`main-meeting__device-menu${compact ? " main-meeting__device-menu--compact" : ""}`}
          role="listbox"
          aria-label={`${label} devices`}
        >
          {options.map((option) => (
            <button
              key={option.deviceId}
              type="button"
              role="option"
              aria-selected={option.deviceId === selectedDeviceId}
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

function getDeviceOptions(devices, kind, label) {
  return devices
    .filter((device) => device.kind === kind)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `${label} ${index + 1}`,
    }));
}

export default function MainMeeting({
  meetingContext,
  initialDevices = {},
  toolsOpen,
  onToggleTools,
  onEndCall,
  children,
}) {
  const room = useRoomContext();
  const {
    localParticipant,
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const [mediaDevices, setMediaDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [deviceError, setDeviceError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [selectedDeviceIds, setSelectedDeviceIds] = useState({
    camera: initialDevices.cameraDeviceId || "",
    microphone: initialDevices.micDeviceId || "",
    speaker: initialDevices.speakerDeviceId || "",
  });

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceError("This browser cannot detect media devices. Use localhost or HTTPS.");
      setLoadingDevices(false);
      return;
    }

    try {
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = getDeviceOptions(availableDevices, "videoinput", "Camera");
      const microphones = getDeviceOptions(availableDevices, "audioinput", "Microphone");
      const speakers = getDeviceOptions(availableDevices, "audiooutput", "Speaker");
      setMediaDevices(availableDevices);
      setSelectedDeviceIds((current) => ({
        camera: cameras.some((device) => device.deviceId === current.camera)
          ? current.camera
          : cameras[0]?.deviceId || "",
        microphone: microphones.some((device) => device.deviceId === current.microphone)
          ? current.microphone
          : microphones[0]?.deviceId || "",
        speaker: speakers.some((device) => device.deviceId === current.speaker)
          ? current.speaker
          : speakers[0]?.deviceId || "",
      }));
      setDeviceError("");
    } catch (error) {
      setDeviceError(error.message || "Could not detect media devices.");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
    };
  }, [refreshDevices]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const speakerDeviceId = initialDevices.speakerDeviceId;
    if (loadingDevices || !speakerDeviceId) return undefined;

    let active = true;
    room.switchActiveDevice("audiooutput", speakerDeviceId, true)
      .then((switched) => {
        if (active && !switched) {
          setDeviceError("This browser does not support selecting an audio output device.");
        }
      })
      .catch((error) => {
        if (active) setDeviceError(error.message || "Could not select the speaker.");
      });

    return () => {
      active = false;
    };
  }, [initialDevices.speakerDeviceId, loadingDevices, room]);

  const cameraOptions = getDeviceOptions(mediaDevices, "videoinput", "Camera");
  const microphoneOptions = getDeviceOptions(mediaDevices, "audioinput", "Microphone");
  const speakerOptions = getDeviceOptions(mediaDevices, "audiooutput", "Speaker");

  const selectDevice = async (group, kind, deviceId) => {
    setDeviceError("");
    try {
      const isActive =
        (group === "camera" && isCameraEnabled) ||
        (group === "microphone" && isMicrophoneEnabled) ||
        group === "speaker";
      if (isActive) {
        const switched = await room.switchActiveDevice(kind, deviceId, true);
        if (!switched) {
          throw new Error(`Your browser could not switch to that ${group} device.`);
        }
      }
      setSelectedDeviceIds((current) => ({ ...current, [group]: deviceId }));
    } catch (error) {
      setDeviceError(error.message || `Could not switch the ${group} device.`);
    }
  };

  const toggleMedia = async (kind) => {
    setDeviceError("");
    if (kind !== "screen" && navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({
          name: kind === "camera" ? "camera" : "microphone",
        });
        if (permission.state === "denied") {
          setDeviceError(
            `${kind === "camera" ? "Camera" : "Microphone"} access is blocked for this site. Allow it in your browser settings, then try again.`,
          );
          return;
        }
      } catch {
        // Some browsers do not support querying camera or microphone permission.
      }
    }

    setPendingAction(kind);
    try {
      if (kind === "camera") {
        await localParticipant.setCameraEnabled(
          !isCameraEnabled,
          !isCameraEnabled && selectedDeviceIds.camera
            ? { deviceId: { exact: selectedDeviceIds.camera } }
            : undefined,
        );
      } else if (kind === "microphone") {
        await localParticipant.setMicrophoneEnabled(
          !isMicrophoneEnabled,
          !isMicrophoneEnabled && selectedDeviceIds.microphone
            ? { deviceId: { exact: selectedDeviceIds.microphone } }
            : undefined,
        );
      } else {
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      }
      await refreshDevices();
    } catch (error) {
      setDeviceError(error.message || `Could not toggle ${kind}. Check your browser permissions.`);
    } finally {
      setPendingAction("");
    }
  };

  const currentTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  return (
    <main className="main-meeting">
      <div className="main-meeting__content">
        <header className="main-meeting__header" aria-label="Meeting information">
          <div className="main-meeting__brand">EDU-MEET</div>
          <div className="main-meeting__class">
            <span>{meetingContext?.subject || `Class ${meetingContext?.classId || ""}`}</span>
            <small>
              {meetingContext?.section || `Block ${meetingContext?.blockId || ""}`}
              {meetingContext?.classId ? ` · Class ${meetingContext.classId}` : ""}
            </small>
          </div>
          <time className="main-meeting__time">{currentTime}</time>
        </header>

        <section className="main-meeting__stage" aria-label="Video meeting participants">
          <div
            className="main-meeting__participant-count"
            aria-live="polite"
            aria-label={`${participants.length} ${participants.length === 1 ? "participant" : "participants"} in the meeting`}
          >
            {participants.length} {participants.length === 1 ? "person" : "people"}
          </div>
          <GridLayout tracks={tracks} className="main-meeting__grid">
            <ParticipantTile />
          </GridLayout>
        </section>

        <footer className="main-meeting__footer">
          {deviceError && (
            <p className="main-meeting__error" role="alert">
              {deviceError}
            </p>
          )}

          <div className="main-meeting__controls" aria-label="Meeting controls">
            <div className="main-meeting__control-group" aria-label="Camera controls">
              <button
                type="button"
                className={`main-meeting__control${isCameraEnabled ? " is-active" : ""}`}
                aria-label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
                aria-pressed={isCameraEnabled}
                disabled={pendingAction !== ""}
                onClick={() => toggleMedia("camera")}
              >
                <Icon name="camera" />
                <span>{isCameraEnabled ? "Camera on" : "Camera off"}</span>
              </button>
              <DeviceSelector
                label="Camera"
                kind="camera"
                options={cameraOptions}
                selectedDeviceId={selectedDeviceIds.camera}
                loading={loadingDevices}
                compact
                onSelect={(deviceId) => selectDevice("camera", "videoinput", deviceId)}
              />
            </div>
            <div className="main-meeting__control-group" aria-label="Audio controls">
              <button
                type="button"
                className={`main-meeting__control${isMicrophoneEnabled ? " is-active" : ""}`}
                aria-label={isMicrophoneEnabled ? "Turn microphone off" : "Turn microphone on"}
                aria-pressed={isMicrophoneEnabled}
                disabled={pendingAction !== ""}
                onClick={() => toggleMedia("microphone")}
              >
                <Icon name="microphone" />
                <span>{isMicrophoneEnabled ? "Mic on" : "Mic off"}</span>
              </button>
              <DeviceSelector
                label="Microphone"
                kind="microphone"
                options={microphoneOptions}
                selectedDeviceId={selectedDeviceIds.microphone}
                loading={loadingDevices}
                compact
                onSelect={(deviceId) => selectDevice("microphone", "audioinput", deviceId)}
              />
              <DeviceSelector
                label="Speaker"
                kind="speaker"
                options={speakerOptions}
                selectedDeviceId={selectedDeviceIds.speaker}
                loading={loadingDevices}
                compact
                onSelect={(deviceId) => selectDevice("speaker", "audiooutput", deviceId)}
              />
            </div>
            <button
              type="button"
              className={`main-meeting__control${isScreenShareEnabled ? " is-active" : ""}`}
              aria-label={isScreenShareEnabled ? "Stop sharing screen" : "Share screen"}
              aria-pressed={isScreenShareEnabled}
              disabled={pendingAction !== ""}
              onClick={() => toggleMedia("screen")}
            >
              <Icon name="screen" />
              <span>{isScreenShareEnabled ? "Stop share" : "Share screen"}</span>
            </button>
            <button
              type="button"
              className={`main-meeting__control${toolsOpen ? " is-active" : ""}`}
              aria-label={toolsOpen ? "Close meeting tools" : "Open meeting tools"}
              aria-expanded={toolsOpen}
              onClick={onToggleTools}
            >
              <Icon name="tools" />
              <span>Tools</span>
            </button>
            <button
              type="button"
              className="main-meeting__control main-meeting__control--leave"
              aria-label="Leave meeting"
              onClick={onEndCall}
            >
              <Icon name="leave" />
              <span>Leave</span>
            </button>
          </div>
        </footer>
      </div>

      {children}
      <RoomAudioRenderer />
    </main>
  );
}
