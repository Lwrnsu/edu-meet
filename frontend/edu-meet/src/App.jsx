import { Routes, Route } from "react-router"

function App() {
  return (
    <>
      <Routes>
        <Route path="*" element={<NotFoundPage />}/>
        <Route path="/" element={<AuthPage />}/>
        <Route element={<Header />} >
          <Route path="/dashboard" element={<DashboardPage />}/>
          <Route path="/chat" element={<ChatPage />}/>
          <Route path="/review" element={<ReviewPage />}/>
          <Route path="/notepad" element={<NotepadPage />}/>
          <Route path="/task" element={<TaskPage />}/>
          <Route path="/class" element={<ClassPage />}/>
          <Route path="/meet" element={< MeetPage/>}/>
          <Route path="/activity" element={<ActivityPage />}/>
          <Route path="/department" element={<DepartmentPage />}/>
          <Route path="/account" element={<AccountManagementPage />}/>
          <Route path="/sys" element={<SchoolSystemPage />}/>
          <Route path="/school" element={<SchoolManagementPage />}/>
        </Route>

      </Routes>
    </>
  )
}

export default App