import { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function TimeOffRequestsPanel({ calendarId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/calendars/${calendarId}/timeoff/pending/`);
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching time off requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await axios.post(`/api/calendars/${calendarId}/timeoff/${id}/approve/`);
      await fetchRequests();
    } catch (err) {
      console.error(`Failed to approve time off request ${id}:`, err);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id) => {
    setRejectingId(id);
    try {
      await axios.post(`/api/calendars/${calendarId}/timeoff/${id}/reject/`);
      fetchRequests();
    } catch (err) {
      console.error(`Failed to reject time off request ${id}:`, err);
    }
    finally {
        setRejectingId(null);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [calendarId]);

  if (loading) return <p>Loading time off requests...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">📝 Pending Time Off Requests</h2>
      {requests.length === 0 ? (
        <p>No pending time off requests.</p>
      ) : (
        requests.map((r) => {
          const isApproving = approvingId === r.id;
          const isRejecting = rejectingId === r.id;

          return (
            <div key={r.id} className="border p-4 rounded mb-3">
              <p><strong>{r.employee_name}</strong> requested time off</p>
              <p>
                {r.start_date} to {r.end_date}
              </p>
              {r.reason && <p className="italic text-sm mt-1">Reason: {r.reason}</p>}
              <div className="mt-2 flex gap-2">
                {(isApproving || isRejecting) ? (
                    <button
                        disabled
                        className={`${
                        isApproving ? 'bg-green-400' : 'bg-red-400'
                        } text-white px-3 py-1 rounded w-full`}
                    >
                        {isApproving ? 'Accepting...' : 'Rejecting...'}
                    </button>
                    ) : (
                    <>
                        <button
                        onClick={() => handleApprove(r.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                        >
                        Approve
                        </button>
                        <button
                        onClick={() => handleReject(r.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                        >
                        Reject
                        </button>
                    </>
                    )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
