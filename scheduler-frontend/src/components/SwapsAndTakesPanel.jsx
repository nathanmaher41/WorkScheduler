import { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function SwapsAndTakesPanel({ calendarId }) {
  const [swaps, setSwaps] = useState([]);
  const [takes, setTakes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [swapsRes, takesRes] = await Promise.all([
        axios.get(`/api/calendars/${calendarId}/swaps/pending/`),
        axios.get(`/api/calendars/${calendarId}/takes/pending/`),
      ]);
      setSwaps(swapsRes.data);
      setTakes(takesRes.data);
    } catch (err) {
      console.error('Error fetching swap/take requests:', err);
    } finally {
      setLoading(false);
    }
  };

    const handleApproveTake = (id) => handleAction('take', id, 'accept');
    const handleRejectTake = (id) => handleAction('take', id, 'reject');

    const handleApproveSwap = (id) => handleAction('swap', id, 'accept');
    const handleRejectSwap = (id) => handleAction('swap', id, 'reject');

  const handleAction = async (type, id, action) => {
    const endpoint = type === 'swap'
        ? `/api/shifts/swap/${id}/${action}/`
        : `/api/shifts/take/${id}/${action}/`

    try {
      await axios.post(endpoint);
      fetchData(); // Refresh list after action
    } catch (err) {
      console.error(`Failed to ${action} ${type} request:`, err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [calendarId]);

  if (loading) return <p>Loading pending requests...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-2">🔁 Pending Swap Requests</h2>
        {swaps.length === 0 ? <p>No pending swaps.</p> : swaps.map((s) => (
          <div key={s.id} className="border p-4 rounded mb-2">
            <p><strong>{s.requesting_employee}</strong> wants to swap with <strong>{s.target_employee}</strong></p>
            <p>{new Date(s.requesting_shift_time.start).toLocaleString()} ↔ {new Date(s.target_shift_time.start).toLocaleString()}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleApproveSwap(s.id)}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                >
                Approve
                </button>
                <button
                onClick={() => handleRejectSwap(s.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2"
                >
                Reject
                </button>

            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">📝 Pending Take Requests</h2>
        {takes.length === 0 ? <p>No pending takes.</p> : takes.map((t) => (
          <div key={t.id} className="border p-4 rounded mb-2">
            <p><strong>{t.requester}</strong> wants to {t.direction === 'take' ? 'take' : 'give'} a shift owned by <strong>{t.shift_owner}</strong></p>
            <p>{new Date(t.shift_time.start).toLocaleString()}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleApproveTake(t.id)}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                >
                Approve
                </button>
                <button
                onClick={() => handleRejectTake(t.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2"
                >
                Reject
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
