import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function ShiftSwapModal({ isOpen, onClose, shift, currentUserId, members, onSwapComplete }) {
  const [yourShifts, setYourShifts] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberShifts, setMemberShifts] = useState([]);
  const [selectedSwapShiftId, setSelectedSwapShiftId] = useState('');
  const [allFutureShifts, setAllFutureShifts] = useState([]);
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [pendingTakes, setPendingTakes] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isOwnShift, setIsOwnShift] = useState(false);
  const [mode, setMode] = useState('swap'); // 'swap' or 'take'

  useEffect(() => {
    setIsOwnShift(shift?.employee === currentUserId);
  }, [shift, currentUserId]);

  const fetchPendingSwaps = async () => {
    try {
      const res = await axios.get('/api/shifts/swap/requests/');
      setPendingSwaps(res.data);
    } catch (err) {
      console.error('Error fetching pending swaps:', err);
    }
  };

  const fetchPendingTakes = async () => {
      try {
        const res = await axios.get('/api/shifts/take/requests/');
        setPendingTakes(res.data);
        console.log(res.data)
      } catch (err) {
        console.error('Error fetching pending takes:', err);
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
    fetchPendingTakes();
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
      setSelectedSwapShiftId('');
      await fetchPendingSwaps();
    } catch (err) {
      console.error('Swap request failed:', err);
    }
  };

  const handleRequestTake = async (direction) => {
    try {
      const payload = {
        shift_id: shift.id,
        direction: direction,
        ...(direction === 'give' && selectedMemberId ? { user_id: selectedMemberId } : {})
      };
      await axios.post('/api/shifts/take/request/', payload);
      setSuccessMessage('Take request sent successfully.');
    } catch (err) {
      console.error('Take request failed:', err);
    }
  };

  const handleApprove = async (swapId) => {
    try {
      await axios.post(`/api/shifts/swap/${swapId}/accept/`);
      setSuccessMessage('Swap approved.');
      await fetchPendingSwaps();
      if (onSwapComplete) onSwapComplete();
    } catch (err) {
      console.error('Error approving swap:', err);
    }
  };

  const handleReject = async (swapId) => {
    try {
      await axios.post(`/api/shifts/swap/${swapId}/reject/`);
      setSuccessMessage('Swap rejected.');
      await fetchPendingSwaps();
    } catch (err) {
      console.error('Error rejecting swap:', err);
    }
  };

  const handleApproveTake = async (takeId) => {
    try {
      await axios.post(`/api/shifts/take/${takeId}/accept/`);
      setSuccessMessage('Take approved.');
      await fetchPendingTakes();
      if (onSwapComplete) onSwapComplete();
    } catch (err) {
      console.error('Error approving take:', err);
    }
  };

  const handleRejectTake = async (takeId) => {
    try {
      await axios.post(`/api/shifts/take/${takeId}/reject/`);
      setSuccessMessage('Take rejected.');
      await fetchPendingTakes();
    } catch (err) {
      console.error('Error rejecting take:', err);
    }
  };


  const formatDate = (datetimeStr) => new Date(datetimeStr).toLocaleDateString();
  const formatTime = (datetimeStr) => new Date(datetimeStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const allRelevantRequests = pendingSwaps.filter(req =>
    req.target_shift_id === shift.id || req.requesting_shift_id === shift.id
  );

  const allRelevantTakes = pendingTakes.filter(req =>
    req.shift === shift.id || (req.direction === 'give' && req.requested_to_id === currentUserId)
  );



  const usedRequestingShiftIds = new Set(
    pendingSwaps
      .filter(req =>
        req.requesting_employee_id === currentUserId &&
        req.target_shift_id === shift.id
      )
      .map(req => req.requesting_shift_id)
  );

  const enrichedTakes = allRelevantTakes.map(req => {
    const isIncomingTake = isOwnShift && req.direction === 'take';
    const isIncomingGive = !isOwnShift && req.direction === 'give' && req.requested_to_id === currentUserId;
    const isOutgoingTake = !isOwnShift && req.direction === 'take' && req.requested_by_id === currentUserId;
    const isOutgoingGive = isOwnShift && req.direction === 'give' && req.requested_by_id === currentUserId;

    return {
      ...req,
      isIncomingTake,
      isIncomingGive,
      isOutgoingTake,
      isOutgoingGive,
    };
  });



  if (!isOpen || !shift) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Shift Details</h2>
        <p><strong>Employee:</strong> {shift.employee_name}</p>
        <p><strong>Date:</strong> {formatDate(shift.start_time)}</p>
        <p><strong>Start:</strong> {formatTime(shift.start_time)}</p>
        <p><strong>End:</strong> {formatTime(shift.end_time)}</p>

        <div className="mt-4 flex gap-2">
          <button
            className={`px-3 py-1 rounded ${mode === 'swap' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setMode('swap')}
          >
            Swap Shift
          </button>
          <button
            className={`px-3 py-1 rounded ${mode === 'take' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setMode('take')}
          >
            Take Shift
          </button>
        </div>

        {successMessage && (
          <p className="mt-4 text-green-600 dark:text-green-400 font-semibold">{successMessage}</p>
        )}

        {mode === 'swap' && (
          <>
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
                  {yourShifts.filter(s => !usedRequestingShiftIds.has(s.id)).map(s => (
                    <option key={s.id} value={s.id}>
                      {formatDate(s.start_time)}: {formatTime(s.start_time)} - {formatTime(s.end_time)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {mode === 'take' && (
          <>
            {isOwnShift ? (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Request someone to take this shift:</h3>
                <select className="w-full border p-2 rounded dark:bg-gray-700 dark:text-white" value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                  <option value="">-- Select a Member --</option>
                  {members.filter(m => m.id !== currentUserId).map(member => (
                    <option key={member.id} value={member.id}>{member.full_name}</option>
                  ))}
                </select>
                <button className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded" onClick={() => handleRequestTake('give')} disabled={!selectedMemberId}>Request Take</button>
              </div>
            ) : (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Request to take this shift:</h3>
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => handleRequestTake('take')}>Take Shift</button>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Take Requests</h3>
              {allRelevantTakes.length > 0 ? (
                <ul className="text-sm space-y-2">
                  {enrichedTakes.map((req) => {
                    const isIncoming = isOwnShift && req.direction === 'take'; // someone wants to take your shift
                    const isOutgoing = !isOwnShift && req.direction === 'take' && req.requester_id === currentUserId; // you want to take someone else's shift
                    const isGiveRequest = req.direction === 'give' && req.requested_to_id === currentUserId && req.shift === shift.id;

                    const isRequestedByYou = req.requested_by_id === currentUserId;

                    return (
                      <li key={req.id} className="flex flex-col gap-1">
                        {/* {isIncoming && !isGiveRequest && (
                          <>
                            <div>Incoming take request from {req.requester}</div>
                            <div className="flex gap-3">
                              <button onClick={() => handleApproveTake(req.id)} className="text-green-600 hover:underline">Approve</button>
                              <button onClick={() => handleRejectTake(req.id)} className="text-red-600 hover:underline">Reject</button>
                            </div>
                          </>
                        )} */}
                        {req.isIncomingTake && (
                          <>
                            <div>Incoming take request from {req.requester}</div>
                            <div className="flex gap-3">
                              <button onClick={() => handleApproveTake(req.id)} className="text-green-600 hover:underline">Approve</button>
                              <button onClick={() => handleRejectTake(req.id)} className="text-red-600 hover:underline">Reject</button>
                            </div>
                          </>
                        )}

                        {req.isIncomingGive && (
                          <>
                            <div>Incoming give request from {req.requester} — asking you to take their shift</div>
                            <div className="flex gap-3">
                              <button onClick={() => handleApproveTake(req.id)} className="text-green-600 hover:underline">Approve</button>
                              <button onClick={() => handleRejectTake(req.id)} className="text-red-600 hover:underline">Reject</button>
                            </div>
                          </>
                        )}

                        {req.isOutgoingTake && (
                          <div>Pending request to take this shift from {req.shift_owner}</div>
                        )}

                        {req.isOutgoingGive && (
                          <div>Pending request asking {req.shift_owner} to take this shift</div>
                        )}

                        {isOutgoing && (
                          <div>Pending request to take this shift from {req.shift_owner}</div>
                        )}

                        {req.direction === 'give' && isRequestedByYou && (
                          <div>Pending request asking {req.shift_owner} to take this shift</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No take requests yet.</p>
              )}
            </div>
          </>
        )}
        {mode === 'swap' && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Swap Requests</h3>
          {allRelevantRequests.length > 0 ? (
            <ul className="list-disc list-inside text-sm space-y-2">
              {allRelevantRequests.map((req, idx) => {
                const isIncoming = req.target_employee_id === currentUserId;
                const isActionable = isIncoming && (req.target_shift_id === shift.id || req.requesting_shift_id === shift.id);
                return (
                  <li key={idx}>
                    {isIncoming ? (
                      <>
                        From: {req.requesting_employee || 'Unknown'} — offering shift on{' '}
                        {req.requesting_shift_time?.start
                          ? `${formatDate(req.requesting_shift_time.start)} ${formatTime(req.requesting_shift_time.start)} - ${formatTime(req.requesting_shift_time.end)}`
                          : 'Unknown time'}
                      </>
                    ) : (
                      <>
                        Pending request to: {req.target_employee || 'Unknown'} — for their shift on{' '}
                        {req.target_shift_time?.start
                          ? `${formatDate(req.target_shift_time.start)} ${formatTime(req.target_shift_time.start)} - ${formatTime(req.target_shift_time.end)}`
                          : 'Unknown time'}
                      </>
                    )}
                    {isActionable && (
                      <div className="flex gap-4 mt-1">
                        <button onClick={() => handleApprove(req.id)} className="text-green-600 hover:underline">Approve</button>
                        <button onClick={() => handleReject(req.id)} className="text-red-600 hover:underline">Reject</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500">No swap requests to display.</p>
          )}
        </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded" onClick={onClose}>Close</button>
          {mode === 'swap' && (
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded"
              onClick={handleRequestSwap}
              disabled={!selectedSwapShiftId}
            >
              Request Swap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
