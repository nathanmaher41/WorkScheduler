// src/components/ShiftSwapModal.jsx
import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function ShiftSwapModal({ isOpen, onClose, shift, currentUserId, members }) {
  const [yourShifts, setYourShifts] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberShifts, setMemberShifts] = useState([]);
  const [selectedSwapShiftId, setSelectedSwapShiftId] = useState('');
  const [allFutureShifts, setAllFutureShifts] = useState([]);
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  const isOwnShift = shift?.employee === currentUserId;

  const fetchPendingSwaps = async () => {
    try {
      const res = await axios.get('/api/shifts/swap/requests/');
      setPendingSwaps(res.data);
      console.log("Fetched swap requests:", res.data);
    } catch (err) {
      console.error('Error fetching pending swaps:', err);
    }
  };

  useEffect(() => {
    const fetchFutureShifts = async () => {
      if (!shift || !isOpen) return;
      try {
        const res = await axios.get(`/api/schedules/${shift.schedule}/shifts/`);
        const futureShifts = res.data.filter(s => new Date(s.start_time) > new Date());
        setAllFutureShifts(futureShifts);

        if (!isOwnShift) {
          const userShifts = futureShifts.filter(s => s.employee === currentUserId);
          setYourShifts(userShifts);
        }
      } catch (err) {
        console.error('Error fetching future shifts:', err);
      }
    };

    fetchFutureShifts();
    fetchPendingSwaps();
  }, [shift, isOpen, isOwnShift, currentUserId]);

  useEffect(() => {
    if (!isOwnShift || !selectedMemberId) return;
    const memberShifts = allFutureShifts.filter(s => s.employee === Number(selectedMemberId));
    setMemberShifts(memberShifts);
  }, [selectedMemberId, allFutureShifts, isOwnShift]);

  const handleRequestSwap = async () => {
    if (!selectedSwapShiftId) return;
    try {
      await axios.post('/api/shifts/swap/request/', {
        requesting_shift_id: isOwnShift ? shift.id : selectedSwapShiftId,
        target_shift_id: isOwnShift ? selectedSwapShiftId : shift.id
      });
      setSuccessMessage('Swap request sent successfully.');
      await fetchPendingSwaps(); // ← fetch updated list immediately
    } catch (err) {
      console.error('Swap request failed:', err);
    }
  };

  if (!isOpen || !shift) return null;

  const formatDate = (datetimeStr) => {
    const date = new Date(datetimeStr);
    return date.toLocaleDateString();
  };

  const formatTime = (datetimeStr) => {
    const date = new Date(datetimeStr);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const incomingRequests = pendingSwaps.filter(req => req.target_shift_id === shift.id);
  const outgoingRequests = pendingSwaps.filter(req => req.requesting_shift_id === shift.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Shift Details</h2>
        <p><strong>Employee:</strong> {shift.employee_name}</p>
        <p><strong>Date:</strong> {formatDate(shift.start_time)}</p>
        <p><strong>Start:</strong> {formatTime(shift.start_time)}</p>
        <p><strong>End:</strong> {formatTime(shift.end_time)}</p>

        {successMessage && (
          <p className="mt-4 text-green-600 dark:text-green-400 font-semibold">{successMessage}</p>
        )}

        {isOwnShift ? (
          <>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Select a member to swap with:</h3>
              <select
                className="w-full border p-2 rounded dark:bg-gray-700 dark:text-white"
                value={selectedMemberId}
                onChange={e => setSelectedMemberId(e.target.value)}
              >
                <option value="">-- Select a Member --</option>
                {members.filter(m => m.id !== currentUserId).map(member => (
                  <option key={member.id} value={member.id}>{member.full_name}</option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Select a shift to swap with:</h3>
              <select
                className="w-full border p-2 rounded dark:bg-gray-700 dark:text-white"
                value={selectedSwapShiftId}
                onChange={e => setSelectedSwapShiftId(e.target.value)}
                disabled={!selectedMemberId}
              >
                <option value="">-- Select a Shift --</option>
                {memberShifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.start_time)}: {formatTime(s.start_time)} - {formatTime(s.end_time)}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Select one of your shifts to offer:</h3>
            <select
              className="w-full border p-2 rounded dark:bg-gray-700 dark:text-white"
              value={selectedSwapShiftId}
              onChange={e => setSelectedSwapShiftId(e.target.value)}
            >
              <option value="">-- Select a Shift --</option>
              {yourShifts.map(s => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.start_time)}: {formatTime(s.start_time)} - {formatTime(s.end_time)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Swap Requests</h3>
          {incomingRequests.length > 0 && (
            <ul className="list-disc list-inside text-sm">
              {incomingRequests.map((req, idx) => (
                <li key={idx}>
                  From: {req.requesting_employee || 'Unknown'} — offering shift on{' '}
                  {req.requesting_shift_time?.start
                    ? `${formatDate(req.requesting_shift_time.start)} ${formatTime(req.requesting_shift_time.start)} - ${formatTime(req.requesting_shift_time.end)}`
                    : 'Unknown time'}
                </li>
              ))}
            </ul>
          )}
          {outgoingRequests.length > 0 && (
            <ul className="list-disc list-inside text-sm">
              {outgoingRequests.map((req, idx) => (
                <li key={idx}>
                  Pending request to: {req.target_employee || 'Unknown'} — for their shift on{' '}
                  {req.target_shift_time?.start
                    ? `${formatDate(req.target_shift_time.start)} ${formatTime(req.target_shift_time.start)} - ${formatTime(req.target_shift_time.end)}`
                    : 'Unknown time'}
                </li>
              ))}
            </ul>
          )}
          {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
            <p className="text-gray-500">No swap requests to display.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded"
            onClick={handleRequestSwap}
            disabled={!selectedSwapShiftId}
          >
            Request Swap
          </button>
        </div>
      </div>
    </div>
  );
}
