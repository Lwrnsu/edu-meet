import { Link, Navigate, Route, Routes } from "react-router";
import VideoRoom from "./Video Conference/VideoRoom.jsx";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/video-conference" replace />}
      />
      <Route path="/video-conference" element={<VideoRoom />} />
      <Route path="/meet" element={<VideoRoom />} />
      <Route path="/Video Conference" element={<VideoRoom />} />
      <Route
        path="*"
        element={
          <main>
            <h1>Page not found</h1>
            <p>
              <Link to="/video-conference">Open the meeting page</Link>
            </p>
          </main>
        }
      />
    </Routes>
  );
}

export default App;