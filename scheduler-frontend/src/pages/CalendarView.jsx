// src/pages/CalendarView.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from '../utils/axios';
import ShiftCreateModal from '../components/ShiftCreateModal';
import ScheduleCreateModal from '../components/ScheduleCreateModal';
import ShiftSwapModal from '../components/ShiftSwapModal';
import InboxIcon from '../components/InboxIcon';
import InboxModal from '../components/InboxModal';

export default function CalendarView() {
  const { id } = useParams();
  const [events, setEvents] = useState([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [members, setMembers] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarAdmin, setIsCalendarAdmin] = useState(false);
  const calendarRef = useRef();
  const [shiftFilter, setShiftFilter] = useState('all'); // 'all', 'mine', 'selected', 'daysIWork', 'daysIDontWork'
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [allShiftsRaw, setAllShiftsRaw] = useState([]);
  const [visibleShifts, setVisibleShifts] = useState([]); // Filtered shifts for display in calendar
  const [unreadCount, setUnreadCount] = useState(0);


  useEffect(() => {
    refreshShifts();
  }, [activeSchedule, shiftFilter, selectedMemberIds]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await axios.get('/api/inbox/unread-count/', 
          {params: { calendar_id: id }});
        setUnreadCount(res.data.unread_count);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();
  }, [showInbox]);


  const refreshShifts = async (scheduleOverride = activeSchedule) => {
  if (!activeSchedule) return;
  try {
    const [shiftsRes, currentUserRes] = await Promise.all([
    axios.get(`/api/schedules/${activeSchedule.id}/shifts/`),
    axios.get('/api/user/')
  ]);

  const rawShifts = shiftsRes.data.map((shift) => {
    const date = new Date(shift.start_time);
    const shiftDate = date.toISOString().split('T')[0];
    return {
      ...shift,
      shiftDate
    };
  });


  const userId = currentUserRes.data.id;
  setCurrentUserId(userId);

  const userShiftDates = new Set(
    rawShifts.filter(s => s.employee === userId).map(s => s.shiftDate)
  );

  const filtered = rawShifts.filter((shift) => {
    const { shiftDate } = shift;
    const include =
      shiftFilter === 'mine' ? shift.employee === userId :
      shiftFilter === 'selected' ? selectedMemberIds.includes(shift.employee) :
      shiftFilter === 'daysIWork' ? userShiftDates.has(shiftDate) :
      shiftFilter === 'daysIDontWork' ? !userShiftDates.has(shiftDate) :
      true;
    return include;
  });

  setVisibleShifts(filtered);

  const formatted = filtered.map((shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);

    const formatTime = (time) => {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      return minutes === 0 ? `${hours}` : `${hours}:${String(minutes).padStart(2, '0')}`;
    };

    const viewType = calendarRef.current?.getApi().view.type;
    const showAMPM = viewType !== 'timeGridWeek' && viewType !== 'timeGridDay';
    const startStr = formatTime(start);
    const endStr = formatTime(end);
    const timeStr = showAMPM
      ? `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : `${startStr} - ${endStr}`;

    const fullName = `${(shift.employee_first_name || '')} ${(shift.employee_last_name || '')}`.trim() || shift.employee_name || shift.employee || 'Unknown';
    return {
      id: shift.id,
      title: `${fullName}\n${timeStr}`,
      start,
      end,
      backgroundColor: shift.color || '#8b5cf6',
      textColor: 'white',
      extendedProps: { shiftData: shift },
      allDay: false
    };
  });

  setEvents(formatted);
  } catch (err) {
    console.error('Error refreshing shifts', err);
  }
};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, userRes, schedulesRes] = await Promise.all([
          axios.get(`/api/calendars/${id}/members/`),
          axios.get('/api/user/'),
          axios.get('/api/schedules/', { params: { calendar_id: id } }),
        ]);

        setMembers(membersRes.data);
        setSchedules(schedulesRes.data);

        if (schedulesRes.data.length > 0 && !activeSchedule) {
          const defaultSchedule = schedulesRes.data[0];
          setActiveSchedule(defaultSchedule);
          const newDate = new Date(defaultSchedule.start_date + 'T00:00:00');
          setCurrentDate(newDate);
          if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.gotoDate(newDate);
          }

          // 🧠 Force refresh after setting active schedule
          await refreshShifts(defaultSchedule);
        }

        const currentUserId = userRes.data.id;
        const currentMember = membersRes.data.find((m) => m.id === currentUserId);
        setIsCalendarAdmin(currentMember?.is_admin || false);
      } catch (err) {
        console.error('Error loading calendar data:', err);
      }

      if (id) {
        loadAllCalendarShifts();
      }
    };

    fetchData();
  }, [id]);

  const handleDateClick = (info) => {
    if (!isCalendarAdmin || !activeSchedule) return;
    setSelectedDate(info.date);
    setShowShiftModal(true);
  };

  const handleScheduleSelect = (schedule) => {
    setActiveSchedule(schedule);
    const newDate = new Date(schedule.start_date + 'T00:00:00');
    setCurrentDate(newDate);
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate);
    }
  };

  const isOutOfRange = (date) => {
    if (!activeSchedule) return false;
    const scheduleStart = new Date(`${activeSchedule.start_date}T00:00:00`);
    const scheduleEnd = new Date(`${activeSchedule.end_date}T23:59:59.999`);
    return date < scheduleStart || date > scheduleEnd;
  };

  function getScrollTime(date, events) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);

    const eventsToday = events.filter(event =>
      event.start >= dayStart && event.start < nextDay
    );

    if (eventsToday.length === 0) return '08:00:00';

    const earliest = eventsToday.reduce((min, curr) =>
      curr.start < min.start ? curr : min
    );

    const hour = earliest.start.getHours();
    const clamped = Math.max(5, Math.min(hour, 12));
    return `${String(clamped).padStart(2, '0')}:00:00`;
  }

  const handleEventClick = (info) => {
    //console.log("Event clicked!", info);
    const shift = info.event.extendedProps.shiftData;
    console.log("Clicked shift ID:", shift.id);
    setSelectedShift(shift);
    setShowSwapModal(true);
  };

  const handleNotificationClick = async (note) => {
    const shiftId = note.related_object_id;
    try {
      const res = await axios.get(`/api/shifts/${shiftId}/`);
      setSelectedShift(res.data);
      setShowSwapModal(true);
      setShowInbox(false);
    } catch (err) {
      console.warn('Shift not found from notification ID:', shiftId, err);
    }
  };


  const loadAllCalendarShifts = async () => {
    try {
      const res = await axios.get(`/api/calendars/${id}/shifts/`);
      const rawShifts = res.data.map((shift) => {
        const date = new Date(shift.start_time);
        return {
          ...shift,
          shiftDate: date.toISOString().split('T')[0],
        };
      });
      setAllShiftsRaw(rawShifts); // ✅ correct this
    } catch (err) {
      console.error('Failed to load all calendar shifts:', err);
    }
  };

  return (
    <div className="flex p-6 min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex-1 mr-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            Calendar View {activeSchedule && `— ${activeSchedule.name}`}
          </h1>
          <div className="flex gap-2 items-center">
            <button
              className="relative flex items-center gap-2 bg-blue-300 dark:bg-blue-700 text-black dark:text-white px-4 py-2 rounded-lg hover:bg-blue-400 dark:hover:bg-blue-600"
              onClick={() => setShowInbox(true)}
            >
              <InboxIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => setShowSettingsModal(true)}>Settings ⚙️</button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            dateClick={handleDateClick}
            initialDate={currentDate}
            height={700}
            eventDisplay="block"
            slotEventOverlap={false}
            slotLabelClassNames={() => ['!border-0']}
            slotLaneClassNames={() => ['!border-0']}
            allDaySlot={false}
            scrollTime="08:00:00"
            eventClick={handleEventClick}
            eventContent={(arg) => {
              const viewType = calendarRef.current?.getApi().view.type;
              const isTimeGrid = viewType === 'timeGridDay' || viewType === 'timeGridWeek';

              const [firstLine, secondLine] = arg.event.title.split('\n');
              const compactName = isTimeGrid
                ? firstLine.split(' ').map(n => n[0]).join('')  // e.g., "Bob Bob" -> "BB"
                : firstLine;

              return (
                <div
                  className={`text-xs px-1 py-0.5 rounded leading-tight overflow-hidden ${
                    isTimeGrid ? 'h-full' : ''
                  }`}
                  style={{
                    backgroundColor: arg.event.backgroundColor,
                    color: arg.event.textColor,
                    height: isTimeGrid ? '100%' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <div className="truncate font-semibold">{compactName}</div>
                  <div className="truncate">{secondLine}</div>
                </div>
              );
            }}
            dayCellClassNames={(arg) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const cellDate = new Date(arg.date);
              cellDate.setHours(0, 0, 0, 0);
              const classes = [];
              if (cellDate.getTime() === today.getTime()) {
                classes.push('!bg-purple-100', 'dark:!bg-purple-200', '!text-black', 'dark:!text-white');
              }
              if (isOutOfRange(cellDate)) {
                classes.push('bg-gray-300', 'dark:bg-gray-600', '!text-white');
              }
              return classes;
            }}
          />
          {showSwapModal && selectedShift && (
            <ShiftSwapModal
              isOpen={showSwapModal}
              onClose={() => setShowSwapModal(false)}
              shift={selectedShift}
              currentUserId={currentUserId}
              members={members}
              onSwapComplete={refreshShifts}
              isAdmin={isCalendarAdmin}
            />
          )}
        </div>
      </div>

      <div
        className="w-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4"
        style={{ height: '700px', display: 'flex', flexDirection: 'column' }}
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">Shift Filters</h2>
          <select
            className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option value="all">All Shifts</option>
            <option value="mine">Only My Shifts</option>
            <option value="selected">Only Selected Members</option>
            <option value="daysIWork">Only Days I Work</option>
            <option value="daysIDontWork">Only Days I'm Off</option>

          </select>

          {shiftFilter === 'selected' && (
            <div className="mt-2">
              {members.map((member) => (
                <label key={member.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMemberIds((prev) => [...prev, member.id]);
                      } else {
                        setSelectedMemberIds((prev) => prev.filter((id) => id !== member.id));
                      }
                    }}
                  />
                  <span className="text-black dark:text-white">{member.full_name || 'null'}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* Scrollable schedules */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">Schedules</h2>
          {isCalendarAdmin && (
            <button
              className="w-full bg-purple-500 dark:bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-500"
              onClick={() => setShowScheduleModal(true)}
            >
              + Create Schedule
            </button>
          )}
        </div>

        {/* Scrollable list of schedules */}
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {schedules.map((schedule) => (
              <li key={schedule.id}>
                <button
                  onClick={() => handleScheduleSelect(schedule)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    activeSchedule?.id === schedule.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    {schedule.name ? (
                      <>
                        <div className="font-semibold">{schedule.name}</div>
                        <div>
                          {new Date(schedule.start_date + 'T00:00:00').toLocaleDateString()} -{' '}
                          {new Date(schedule.end_date + 'T00:00:00').toLocaleDateString()}
                        </div>
                      </>
                    ) : (
                      <div>
                        {new Date(schedule.start_date + 'T00:00:00').toLocaleDateString()} -{' '}
                        {new Date(schedule.end_date + 'T00:00:00').toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showShiftModal && (
        <ShiftCreateModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          calendarId={id}
          scheduleId={activeSchedule?.id}
          selectedDate={selectedDate}
          members={members}
        />
      )}

      {showShiftModal && (
        <ShiftCreateModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          calendarId={id}
          scheduleId={activeSchedule?.id}
          selectedDate={selectedDate}
          members={members}
          onCreate={(newShift) => {
            const start = new Date(newShift.start_time);
            const end = new Date(newShift.end_time);
            const timeStr = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
            const fullName = `${(newShift.employee_first_name || '')} ${(newShift.employee_last_name || '')}`.trim() || newShift.employee_name || newShift.employee || 'Unknown';
            setEvents((prev) => [...prev, {
              id: newShift.id,
              title: `${fullName}\n${timeStr}`,
              start,
              end,
              backgroundColor: newShift.color,
              textColor: 'white',
              extendedProps: { shiftData: newShift },
              allDay: false
            }]);
            setShowShiftModal(false);
          }}
        />
      )}
      {showInbox && (
        <InboxModal
          isOpen={showInbox}
          onClose={() => setShowInbox(false)}
          onNotificationClick={handleNotificationClick}
          calendarId={id}
        />
      )}
      {showScheduleModal && (
        <ScheduleCreateModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onCreate={(schedule) => {
            setActiveSchedule(schedule);
            setSchedules(prev => [...prev, schedule]);
            setActiveSchedule(schedule);
            const newDate = new Date(schedule.start_date + 'T00:00:00');
            setCurrentDate(newDate);
            if (calendarRef.current) {
              const calendarApi = calendarRef.current.getApi();
              calendarApi.gotoDate(newDate);
            }
            setShowScheduleModal(false);
          }}
          calendarId={id}
        />
      )}
    </div>
  );
}
