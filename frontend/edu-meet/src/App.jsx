import { Routes, Route } from "react-router"
<<<<<<< HEAD
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

=======
import Faculty from "./compilerfrontend/Faculty"
import Student from "./compilerfrontend/Student"
>>>>>>> origin/MACARAEG
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
<<<<<<< HEAD
      <Routes>
        <Route path="/" element={<LoginPage />}/>
      </Routes>
=======
      <Faculty/>
>>>>>>> origin/MACARAEG
    </>
  )
}

export default App
