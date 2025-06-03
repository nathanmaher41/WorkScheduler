import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import ShiftCreateModal from './ShiftCreateModal';

export default function ShiftSwapModal({ isOpen, onClose, shift, currentUserId, members, onSwapComplete, isAdmin }) {
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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    console.log("ShiftSwapModal isAdmin:", isAdmin);
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
        console.log('All pending take requests:', res.data);
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
      await fetchPendingTakes();  // 👈 refresh the list right away
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

  const hasAlreadyRequestedTake = pendingTakes.some(
    (req) =>
      Number(req.shift) === Number(shift.id) &&
      req.direction === 'take' &&
      req.requested_by_id === currentUserId
  );



  const formatDate = (datetimeStr) => new Date(datetimeStr).toLocaleDateString();
  const formatTime = (datetimeStr) => new Date(datetimeStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const allRelevantRequests = pendingSwaps.filter(req =>
    req.target_shift_id === shift.id || req.requesting_shift_id === shift.id
  );

  pendingTakes.forEach(req => {
  if (Number(req.shift) === Number(shift.id)) {
    console.log('Potential match:', {
      req_id: req.id,
      shift_id: req.shift,
      requested_by_id: req.requested_by_id,
      requested_to_id: req.requested_to_id,
      shift_employee: shift.employee,
      currentUserId,
    });
  }
});

 const allRelevantTakes = pendingTakes.filter(req =>
    Number(req.shift) === Number(shift.id) &&
    (
      Number(req.requested_by_id) === Number(currentUserId) ||
      Number(req.requested_to_id) === Number(currentUserId) ||
      Number(shift.employee) === Number(currentUserId)
    )
  );

  const handleCancelSwap = async (swapId) => {
  try {
    await axios.delete(`/api/swap/cancel/${swapId}/`);
    setSuccessMessage('Swap request cancelled.');
    await fetchPendingSwaps();
  } catch (err) {
    console.error('Error cancelling swap:', err);
  }
};

  const handleCancelTake = async (takeId) => {
    try {
      await axios.delete(`/api/take/cancel/${takeId}/`);
      setSuccessMessage('Take request cancelled.');
      await fetchPendingTakes();
    } catch (err) {
      console.error('Error cancelling take:', err);
    }
  };





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

  const usedGiveRequestUserIds = new Set(
    enrichedTakes
      .filter(req =>
        req.direction === 'give' &&
        req.requested_by_id === currentUserId &&
        req.shift === shift.id
      )
      .map(req => req.requested_to_id)
  );




  if (!isOpen || !shift) return null;
  if (isEditing) {
    return (
      <ShiftCreateModal
      isOpen={true}
      onClose={() => setIsEditing(false)}
      existingShift={shift}
      mode="edit"
      members={members}
      selectedDate={new Date(shift.start_time)}
      onShiftSaved={(updatedShift) => {
        setIsEditing(false);
        // update modal shift in-place so user sees it live
        shift.start_time = updatedShift.start_time;
        shift.end_time = updatedShift.end_time;
        shift.employee = updatedShift.employee;
        shift.employee_name = updatedShift.employee_name;
        shift.position = updatedShift.position;
        if (onSwapComplete) onSwapComplete(); // trigger calendar re-render
        onClose(); 
      }}
    />
    );
  }
  else{
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black dark:text-white">Shift Details</h2>
          {isAdmin && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Edit Shift
            </button>
          )}
        </div>
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
            className={`px-3 py-1 rounded ${mode === 'take' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
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
                    <option key={member.id} value={member.id} disabled={usedGiveRequestUserIds.has(member.id)}>{member.full_name}</option>
                  ))}
                </select>
                <button className="mt-2 px-3 py-1 bg-purple-600 text-white rounded" onClick={() => handleRequestTake('give')} disabled={!selectedMemberId || usedGiveRequestUserIds.has(Number(selectedMemberId))}>Request Take</button>
              </div>
            ) : (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Request to take this shift:</h3>
                <button className="px-3 py-1 bg-purple-600 text-white rounded" onClick={() => handleRequestTake('take')} disabled={hasAlreadyRequestedTake}>
                  {hasAlreadyRequestedTake ? 'Request Sent' : 'Take Shift'}
                </button>
              </div>
            )}

            <div className="mt-2">
              <h3 className="font-semibold mb-2">Take Requests</h3>
              <div className="max-h-40 overflow-y-auto pr-1">
              {allRelevantTakes.length > 0 ? (
                <ul className="text-sm space-y-2">
                  {enrichedTakes.map((req) => {
                    let content = null;

                    if (req.isIncomingTake) {
                      content = (
                        <>
                          <div>Incoming take request from {req.requester}</div>
                          <div className="flex gap-3">
                            <button onClick={() => handleApproveTake(req.id)} className="text-green-600 hover:underline">Approve</button>
                            <button onClick={() => handleRejectTake(req.id)} className="text-red-600 hover:underline">Reject</button>
                          </div>
                        </>
                      );
                    } else if (req.isIncomingGive) {
                      content = (
                        <>
                          <div>Incoming give request from {req.requester} — asking you to take their shift</div>
                          <div className="flex gap-3">
                            <button onClick={() => handleApproveTake(req.id)} className="text-green-600 hover:underline">Approve</button>
                            <button onClick={() => handleRejectTake(req.id)} className="text-red-600 hover:underline">Reject</button>
                          </div>
                        </>
                      );
                    } else if (req.isOutgoingTake) {
                      content = (
                        <>
                          <div>Pending request to take this shift from {req.shift_owner}</div>
                          <div className="flex gap-3">
                            <button onClick={() => handleCancelTake(req.id)} className="text-purple-600 hover:underline">Cancel</button>
                          </div>
                        </>
                      );
                    } else if (req.isOutgoingGive) {
                      content = (
                        <>
                          <div>Pending request asking {req.shift_owner} to take this shift</div>
                          <div className="flex gap-3">
                            <button onClick={() => handleCancelTake(req.id)} className="text-purple-600 hover:underline">Cancel</button>
                          </div>
                        </>
                      );
                    }

                    return (
                      <li key={req.id} className="text-sm space-y-1">
                        {content}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No take requests yet.</p>
              )}
              </div>
            </div>
          </>
        )}
        {mode === 'swap' && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Swap Requests</h3>
           <div className="max-h-40 overflow-y-auto pr-1">
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

                    <div className="flex gap-4 mt-1">
                      {isActionable && (
                        <>
                          <button onClick={() => handleApprove(req.id)} className="text-green-600 hover:underline">Approve</button>
                          <button onClick={() => handleReject(req.id)} className="text-red-600 hover:underline">Reject</button>
                        </>
                      )}
                      {!isIncoming && (
                        <button onClick={() => handleCancelSwap(req.id)} className="text-purple-600 hover:underline">Cancel</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500">No swap requests to display.</p>
          )}
          </div>
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
}
