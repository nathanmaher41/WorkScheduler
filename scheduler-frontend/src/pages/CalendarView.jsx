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


  useEffect(() => {
    const fetchShifts = async () => {
      if (!activeSchedule) return;
      try {
        const res = await axios.get(`/api/schedules/${activeSchedule.id}/shifts/`);
        const currentUserRes = await axios.get('/api/user/');
        const currentUserId = currentUserRes.data.id;

        const formatted = res.data
          .filter((shift) => {
            if (shiftFilter === 'mine') return shift.employee === currentUserId;
            if (shiftFilter === 'selected') return selectedMemberIds.includes(shift.employee);
            return true; // 'all' and default
          })
          .map((shift) => {
            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            const timeStr = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
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
        console.error('Error loading shifts', err);
      }
    };
    fetchShifts();
  }, [activeSchedule, shiftFilter, selectedMemberIds]);

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

        const currentUserId = userRes.data.id;
        const currentMember = membersRes.data.find((m) => m.id === currentUserId);
        setIsCalendarAdmin(currentMember?.is_admin || false);
      } catch (err) {
        console.error('Error loading calendar data:', err);
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

  return (
    <div className="flex p-6 min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex-1 mr-6">
        <h1 className="text-2xl font-bold mb-4">
          Calendar View {activeSchedule && `— ${activeSchedule.name}`}
        </h1>
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
            eventContent={(arg) => {
              const viewType = calendarRef.current?.getApi().view.type;
              const isTimeGrid = viewType === 'timeGridDay' || viewType === 'timeGridWeek';
              return (
                <div
                  className={`text-xs whitespace-pre-wrap px-1 py-0.5 rounded ${isTimeGrid ? 'h-full' : ''}`}
                  style={{
                    backgroundColor: arg.event.backgroundColor,
                    color: arg.event.textColor,
                    height: isTimeGrid ? '100%' : 'auto'
                  }}
                >
                  {arg.event.title}
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
        <div className="flex-1 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">Schedules</h2>
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

        {isCalendarAdmin && (
          <button
            className="mt-4 w-full bg-purple-500 dark:bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-500"
            onClick={() => setShowScheduleModal(true)}
          >
            + Create Schedule
          </button>
        )}
      </div>


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
