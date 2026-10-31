import React, { useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

export default function VideoRoom() {
  const [roomName, setRoomName] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

  // Fetch token from Spring Boot backend
  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");

    if (!liveKitUrl) {
      setError("set VITE_LIVE_KIT in frontend/edu-meet/.env");
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`${apiUrl}/api/room/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, participantName }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Token request failed (${response.status})`,
        );
      }
      if (!data.token) {
        throw new Error("The backend response did not contain a token.");
      }

      setToken(data.token);
    } catch (err) {
      console.error("Error fetching token:", err);
      setError(
        err.message ||
          "Could not join the room. Check that the backend is running.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  // If no token yet, show the Join Form (Room ID & User Name)
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
            <label style={{ display: "block", marginBottom: "4px" }}>
              Room ID / Name:
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Class-101"
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Your Name:
            </label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="e.g. Clyde"
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          {error && (
            <p role="alert" style={{ color: "red" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isJoining}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            {isJoining ? "Joining..." : "Join Call"}
          </button>
        </form>
      </div>
    );
  }

  // Once token is received, render the video grid & controls
  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={liveKitUrl}
      data-lk-theme="default"
      style={{ height: "100vh" }}
      onError={(roomError) => {
        console.error("LiveKit connection error:", roomError);
        setError(`LiveKit connection error: ${roomError.message}`);
      }}
      onDisconnected={() => {
        setToken("");
        setError(
          "Disconnected from the room. Check the LiveKit URL and network connection, then try again.",
        );
      }}
    >
      <MyVideoConference />
      <RoomAudioRenderer />
      <ControlBar />
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
