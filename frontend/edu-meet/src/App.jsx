import { Routes, Route } from "react-router"
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { Lobby } from "./Video Conference/Lobby.jsx";
import ChatbotLauncher from './components/ChatbotLauncher.jsx'
import { AnnouncementsPage, ClassFeedPage, ResourcesPage, ViewFilePage } from './features/files-and-posts'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />}/>
        <Route path="/admin" element={<AdminLoginPage />}/>
        {/* Group 7 · File Management & Blogs */}
        <Route path="/classes/:classId/feed" element={<ClassFeedPage />}/>
        <Route path="/classes/:classId/resources" element={<ResourcesPage />}/>
        <Route path="/classes/:classId/resources/:fileId" element={<ViewFilePage />}/>
        <Route path="/announcements" element={<AnnouncementsPage />}/>
      </Routes>
      <ChatbotLauncher />
    </>
  )
}

export default App
