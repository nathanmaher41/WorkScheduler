import { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function SwapsAndTakesPanel({ calendarId, currentMember, effectivePermissions }) {
  const [swaps, setSwaps] = useState([]);
  const [takes, setTakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState({ type: null, id: null, action: null });

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

  const handleAction = async (type, id, action) => {
    setProcessingRequest({ type, id, action });
    const endpoint = type === 'swap'
      ? `/api/shifts/swap/${id}/${action}/`
      : `/api/shifts/take/${id}/${action}/`;

    try {
      await axios.post(endpoint);
      fetchData();
    } catch (err) {
      console.error(`Failed to ${action} ${type} request:`, err);
    } finally {
      setProcessingRequest({ type: null, id: null, action: null });
    }
  };

  const handleApproveTake = (id) => handleAction('take', id, 'accept');
  const handleRejectTake = (id) => handleAction('take', id, 'reject');
  const handleApproveSwap = (id) => handleAction('swap', id, 'accept');
  const handleRejectSwap = (id) => handleAction('swap', id, 'reject');

  useEffect(() => {
    fetchData();
  }, [calendarId]);

  if (loading) return <p>Loading pending requests...</p>;

  return (
  <div className="space-y-8">
    {(currentMember.is_admin || effectivePermissions?.some(p => p.codename === 'approve_reject_swap_requests')) && (
      <div>
        <h2 className="text-lg font-semibold mb-2">🔁 Pending Swap Requests</h2>
        <div className="max-h-[400px] overflow-y-auto pr-2">
          {swaps.length === 0 ? (
            <p>No pending swaps.</p>
          ) : (
            swaps.map((s) => (
              <div key={s.id} className="border p-4 rounded mb-2">
                <p>
                  <strong>{s.requesting_employee}</strong> wants to swap with{' '}
                  <strong>{s.target_employee}</strong>
                </p>
                <p>
                  {new Date(s.requesting_shift_time.start).toLocaleString()} ↔{' '}
                  {new Date(s.target_shift_time.start).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleApproveSwap(s.id)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                    disabled={
                      processingRequest.type === 'swap' &&
                      processingRequest.id === s.id &&
                      processingRequest.action === 'accept'
                    }
                  >
                    {processingRequest.type === 'swap' &&
                    processingRequest.id === s.id &&
                    processingRequest.action === 'accept'
                      ? 'Accepting...'
                      : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRejectSwap(s.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2"
                    disabled={
                      processingRequest.type === 'swap' &&
                      processingRequest.id === s.id &&
                      processingRequest.action === 'reject'
                    }
                  >
                    {processingRequest.type === 'swap' &&
                    processingRequest.id === s.id &&
                    processingRequest.action === 'reject'
                      ? 'Rejecting...'
                      : 'Reject'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )}

    {(currentMember.is_admin || effectivePermissions?.some(p => p.codename === 'approve_reject_take_requests')) && (
      <div>
        <h2 className="text-lg font-semibold mb-2">📝 Pending Take Requests</h2>
        <div className="max-h-[400px] overflow-y-auto pr-2">
          {takes.length === 0 ? (
            <p>No pending takes.</p>
          ) : (
            takes.map((t) => (
              <div key={t.id} className="border p-4 rounded mb-2">
                <p>
                  <strong>{t.requester}</strong> wants to{' '}
                  {t.direction === 'take' ? 'take' : 'give'} a shift owned by{' '}
                  <strong>{t.shift_owner}</strong>
                </p>
                <p>{new Date(t.shift_time.start).toLocaleString()}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleApproveTake(t.id)}
                    disabled={
                      processingRequest.type === 'take' &&
                      processingRequest.id === t.id &&
                      processingRequest.action === 'accept'
                    }
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                  >
                    {processingRequest.type === 'take' &&
                    processingRequest.id === t.id &&
                    processingRequest.action === 'accept'
                      ? 'Accepting...'
                      : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRejectTake(t.id)}
                    disabled={
                      processingRequest.type === 'take' &&
                      processingRequest.id === t.id &&
                      processingRequest.action === 'reject'
                    }
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2 disabled:opacity-50"
                  >
                    {processingRequest.type === 'take' &&
                    processingRequest.id === t.id &&
                    processingRequest.action === 'reject'
                      ? 'Rejecting...'
                      : 'Reject'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )}
  </div>
);
}
