import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import CalendarView from "./pages/CalendarView";
import AdminPanel from "./pages/AdminPanel"; // ✅ Import your admin panel
import JoinRedirectHandler from "./components/JoinRedirectHandler";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
 import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/activate-success" element={<ActivateSuccess />} />
        <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="/resend-activation" element={<ResendActivation />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/calendar/:id" element={<CalendarView />} />
        <Route path="/calendar/:id/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} /> {/* ✅ New route */}
        <Route path="/join/:token" element={<JoinRedirectHandler />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordPage />} />   

        <Route path="/reset-password" element={<ProtectedRoute><ResetPasswordConfirmPage /></ProtectedRoute>} />
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