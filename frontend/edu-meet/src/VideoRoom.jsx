import React, { useState } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

export default function VideoRoom() {
  const [roomName, setRoomName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [token, setToken] = useState('');

  // Fetch token from Spring Boot backend
  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/room/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, participantName }),
      });
      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      console.error('Error fetching token:', err);
    }
  };

  // If no token yet, show the Join Form (Room ID & User Name)
  if (!token) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: 'auto', fontFamily: 'sans-serif' }}>
        <h2>Join Classroom</h2>
        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Room ID / Name:</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Class-101"
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Your Name:</label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="e.g. Clyde"
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px 16px', cursor: 'pointer' }}>
            Join Call
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
      serverUrl="ws://localhost:7880"
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={() => setToken('')}
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
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 80px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}
