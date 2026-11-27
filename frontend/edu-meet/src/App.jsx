import { useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router";
import { getAuthBearerToken } from "./api/auth";
import LoginPage from "./pages/LoginPage.jsx";
import VideoRoom from "./Video Conference/VideoRoom.jsx";

function LoginRoute({ onAuthenticated }) {
  const navigate = useNavigate();

  return (
    <LoginPage
      onSuccess={() => {
        onAuthenticated();
        navigate("/video-conference", { replace: true });
      }}
    />
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(getAuthBearerToken()),
  );
  const loginRoute = (
    <LoginRoute onAuthenticated={() => setIsAuthenticated(true)} />
  );
  const meetingRoute = isAuthenticated ? (
    <VideoRoom />
  ) : (
    <Navigate to="/login" replace />
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/video-conference" replace />
          ) : (
            loginRoute
          )
        }
      />
      <Route path="/login" element={loginRoute} />
      <Route path="/video-conference" element={meetingRoute} />
      <Route path="/meet" element={meetingRoute} />
      <Route path="/Video Conference" element={meetingRoute} />
      <Route
        path="*"
        element={
          <main>
            <h1>Page not found</h1>
            <p>
              <Link to={isAuthenticated ? "/video-conference" : "/login"}>
                {isAuthenticated ? "Open the meeting page" : "Sign in"}
              </Link>
            </p>
          </main>
        }
      />
    </Routes>
  );
}

export default App