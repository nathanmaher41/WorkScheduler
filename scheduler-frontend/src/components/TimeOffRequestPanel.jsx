import { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function TimeOffRequestsPanel({ calendarId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
    try {
        await axios.post(`/api/calendars/${calendarId}/timeoff/${id}/approve/`);
        fetchRequests();
    } catch (err) {
        console.error(`Failed to approve time off request ${id}:`, err);
    }
    };


  const handleReject = async (id) => {
    try {
        await axios.post(`/api/calendars/${calendarId}/timeoff/${id}/reject/`);
        fetchRequests();
    } catch (err) {
        console.error(`Failed to reject time off request ${id}:`, err);
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
        requests.map((r) => (
          <div key={r.id} className="border p-4 rounded mb-3">
            <p><strong>{r.employee_name}</strong> requested time off</p>
            <p>
              {r.start_date} to {r.end_date}
            </p>
            {r.reason && <p className="italic text-sm mt-1">Reason: {r.reason}</p>}
            <div className="mt-2 flex gap-2">
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
            </div>
          </div>
        ))
      )}
    </div>
  );
}
