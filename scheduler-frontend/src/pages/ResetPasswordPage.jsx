import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    try {
      await axios.post(`/api/password-reset/confirm/${uidb64}/${token}/`, { password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed.');
    }
  };

  const queryParams = new URLSearchParams(window.location.search);
  const from = queryParams.get('from');

  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        if (from === 'settings') {
          window.location.href = '/dashboard?settings=1';
        } else {
          navigate('/login');
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [success, from, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <form onSubmit={handleReset} className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Reset Password</h2>
        {success ? (
          <p className="text-green-600">Password reset! Redirecting to login…</p>
        ) : (
          <>
            <label className="block mb-2 text-gray-800 dark:text-gray-100">New Password</label>
            <PasswordInput
              name="new-password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="block mb-2 mt-4 text-gray-800 dark:text-gray-100">Confirm Password</label>
            <PasswordInput
              name="confirm-password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded"
            >
              Reset Password
            </button>
          </>
        )}
      </form>
    </div>
  );
}
