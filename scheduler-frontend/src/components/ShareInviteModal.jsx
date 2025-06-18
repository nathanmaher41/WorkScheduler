import { useState } from 'react';
import axios from '../utils/axios';

export default function ShareInviteModal({ calendarId, calendarName, onClose }) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      await axios.post(`/api/calendars/${calendarId}/invite/`, {
        email_or_username: input.trim()
      });
      setStatus('Invite sent successfully.');
      setInput('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Invite to {calendarName}</h2>

        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-white">
          Email or Username:
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. alice@example.com or alice123"
        />

        <button
          className="mt-4 w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
          onClick={handleInvite}
          disabled={loading || !input.trim()}
        >
          {loading ? 'Sending...' : 'Send Invite'}
        </button>

        {status && <p className="mt-3 text-green-600 dark:text-green-400 text-sm">{status}</p>}
        {error && <p className="mt-3 text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <button
          className="mt-4 text-sm text-gray-600 dark:text-gray-300 hover:underline block mx-auto"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
