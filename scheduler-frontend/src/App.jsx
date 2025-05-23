import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CheckEmail from "./pages/CheckEmail";
import ActivateSuccess from './pages/ActivateSuccess';
import ProtectedRoute from "./components/ProtectedRoute";
import UserSettings from './pages/UserSettings';
import ResendActivation from './pages/ResendActivation';
import CompleteProfile from "./pages/CompleteProfile";
import DarkTest from './components/DarkTest';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/activate-success" element={<ActivateSuccess />} />
        <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="/resend-activation" element={<ResendActivation />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

