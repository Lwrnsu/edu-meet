import { Routes, Route } from "react-router"
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

function App() {
  const checkPrefix = window.location.hostname;
  if (checkPrefix.startsWith("admin.")) {
    return (
      <>
        <AdminLoginPage />
      </>
    );
  } 
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />}/>
      </Routes>
    </>
  )
}

export default App
