import Faculty from "./compilerfrontend/Faculty"
import Student from "./compilerfrontend/Student"
function App() {
  const checkPrefix = window.location.hostname;
  if (checkPrefix.startsWith("admin.")) {
    return (
      <>
        <AdminLoginPage />
      </>
    );
  } 
