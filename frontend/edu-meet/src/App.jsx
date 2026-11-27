import { Routes, Route } from "react-router"
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { Lobby } from "./Video Conference/Lobby.jsx";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />}/>
        <Route path="/admin" element={<AdminLoginPage />}/>
      </Routes>
    </>
  )
}

export default App
