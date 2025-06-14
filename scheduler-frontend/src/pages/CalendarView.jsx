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
import ScheduleCard from '../components/ScheduleCard';
import RequestOffModal from '../components/RequestOffModal';
import SettingsIcon from '../components/SettingsIcon';
import TimeOffModal from '../components/TimeOffModal';
import CalendarSettingsModal from '../components/CalendarSettingsModal';
import { useNavigate } from 'react-router-dom';
import HolidayModal from '../components/HolidayModal';
import { useLocation } from 'react-router-dom';

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
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [calendarName, setCalendarName] = useState('');
  const [showRequestOffModal, setShowRequestOffModal] = useState(false);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [selectedTimeOff, setSelectedTimeOff] = useState(null);
  const [workplaceHolidays, setWorkplaceHolidays] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [calendarRoles, setCalendarRoles] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [effectivePermissions, setEffectivePermissions] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);


  const navigate = useNavigate();

  useEffect(() => {
    // if (activeSchedule?.id) {
      refreshShifts(activeSchedule);
    //}
  }, [activeSchedule, shiftFilter, selectedMemberIds]);//[activeSchedule?.id, activeSchedule?.start_date, activeSchedule?.end_date, shiftFilter, selectedMemberIds]);

  const fetchTimeOffs = async () => {
      try {
        const res = await axios.get(`/api/calendars/${id}/timeoff/`);
        setTimeOffRequests(res.data);
      } catch (err) {
        console.error('Failed to fetch time off requests:', err);
      }
    };
  useEffect(() => {

    fetchTimeOffs();
  }, []);

  

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


  const refreshShifts = async (schedule = activeSchedule, timeOffsOverride = null, holidayOverride = null) => {
    if (!schedule) { // || !schedule.id
      setVisibleShifts([]);
      setEvents([]);
      return;
    }

    try {
      const [shiftsRes, currentUserRes] = await Promise.all([
        schedule.id
          ? axios.get(`/api/schedules/${schedule.id}/shifts/`)
          : Promise.resolve({ data: [] }),
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
      const parseLocalDate = (str) => {
        const [year, month, day] = str.split('-').map(Number);
        return new Date(year, month - 1, day); // ← Local date constructor!
      };
      let freshTimeOffs = timeOffsOverride;
        if (!freshTimeOffs) {
          try {
            const res = await axios.get(`/api/calendars/${id}/timeoff/`);
            freshTimeOffs = res.data;
            setTimeOffRequests(res.data);
          } catch (err) {
            console.error("Could not load time offs", err);
            freshTimeOffs = [];
          }
        }
        const timeOffEvents = activeSchedule?.isDefault
          ? freshTimeOffs
              .filter((req) =>
                req.status === 'approved' ||
                (req.status === 'pending' && req.employee === currentUserId)
              )
              .map((req) => {
                const memberColor =
                  req.color ||
                  members.find((m) => m.id === req.employee)?.color ||
                  '#8b5cf6';

                const isPending = req.status === 'pending' && req.employee === currentUserId;

                return {
                  id: `timeoff-${req.id}`,
                  title: isPending
                    ? `${req.employee_name || 'Unknown'}\n(Pending Approval)`
                    : `${req.employee_name || 'Unknown'}\nOff Work`,
                  start: parseLocalDate(req.start_date),
                  end: new Date(parseLocalDate(req.end_date).getTime() + 86400000),
                  allDay: true,
                  backgroundColor: memberColor,
                  textColor: 'white',
                  extendedProps: {
                    type: 'timeoff',
                    timeOffData: { ...req, calendar: id },
                  },
                };
              })
          : [];
          const to12Hour = (t) => {
            const [h, m] = t.split(':');
            const hour = parseInt(h, 10);
            const suffix = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${m} ${suffix}`;
          };
          const holidaysToUse = holidayOverride ?? workplaceHolidays;
          const holidayEvents = schedule?.isDefault
            ? holidaysToUse.map((h) => {
                const holidayDate = parseLocalDate(h.date);
                const end = h.end_date
                  ? new Date(parseLocalDate(h.end_date).getTime() + 86400000)
                  : new Date(holidayDate.getTime() + 86400000);

                const isAltered = h.type === 'custom';
                const note = h.title?.trim()
                  ? (isAltered
                      ? `⚠️ ${h.title}\n${to12Hour(h.start_time)} - ${to12Hour(h.end_time)}`
                      : `${h.title}${h.note?.trim() ? `\n${h.note}` : '\n\u200B'}`)
                  : (isAltered
                      ? `⚠️ Altered Hours:\n${to12Hour(h.start_time)} - ${to12Hour(h.end_time)}`
                      : '🚫 Holiday\nNo Work');

                return {
                  id: `holiday-${h.id}`,
                  title: note,
                  start: holidayDate,
                  end: end,
                  allDay: true,
                  backgroundColor: 'rgba(255, 99, 132, 0.5)',
                  textColor: 'white',
                  extendedProps: {
                    type: 'holiday',
                    holidayData: h
                  }
                };
              })
            : [];

            // const holidayBackgroundEvents = !schedule?.isDefault
            //   ? holidaysToUse.flatMap((h) => {
            //       const start = parseLocalDate(h.date);
            //       const end = h.end_date ? parseLocalDate(h.end_date) : start;

            //       return getDatesInRange(start, end).map((date) => ({
            //         id: `holiday-highlight-${h.id}-${date.toISOString().split('T')[0]}`,
            //         start: date,
            //         end: new Date(date.getTime() + 86400000),
            //         rendering: 'background',
            //         backgroundColor: 'rgba(255, 99, 132, 0.25)',
            //         allDay: true,
            //       }));
            //     })
            //   : [];
      setEvents(() => [...formatted, ...timeOffEvents, ...holidayEvents]);
    } catch (err) {
      console.error('Error refreshing shifts', err);
    }
  };

  const isWorkplaceHoliday = (date) => {
    const cell = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return workplaceHolidays.some(h => {
      const start = new Date(h.date);
      const end = h.end_date ? new Date(h.end_date) : new Date(start);
      end.setDate(end.getDate() + 1); // include the last day

      return cell >= start && cell < end;
    });
  };

  useEffect(() => {
    const fetchEffectivePermissions = async () => {
      const currentMember = members.find((m) => m.user === currentUserId); // ✅ not m.id
      if (!currentMember) return;

      try {
        const res = await axios.get(`/api/calendars/${id}/members/${currentMember.id}/effective-permissions/`);
        setEffectivePermissions(res.data.permissions); // ✅ use "permissions" wrapper
      } catch (err) {
        console.error('Failed to fetch effective permissions:', err);
      }
    };

    if (members.length > 0 && currentUserId) {
      fetchEffectivePermissions();
    }
  }, [id, members, currentUserId]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, userRes, schedulesRes, calendarRes, holidaysRes] = await Promise.all([
          axios.get(`/api/calendars/${id}/members/`),
          axios.get('/api/user/'),
          axios.get('/api/schedules/', { params: { calendar_id: id } }),
          axios.get(`/api/calendars/${id}/`),
          axios.get(`/api/calendars/${id}/holidays/`),
        ]);
        setCalendarRoles(calendarRes.data.roles || []);
        setCalendarName(calendarRes.data.name);
        setMembers(membersRes.data);
        setCalendar(calendarRes.data);
        const defaultSchedule = {
          id: null,
          name: calendarRes.data.name,
          isDefault: true,
          start_date: null,
          end_date: null,
        };
        const allSchedules = [defaultSchedule, ...schedulesRes.data];
        setSchedules(allSchedules);
        setWorkplaceHolidays(holidaysRes.data);

        // Only set it if not already set — and use the correct defaultSchedule
        const savedScheduleId = localStorage.getItem(`selectedScheduleId-${id}`);
        let initialSchedule = defaultSchedule;

        if (savedScheduleId && savedScheduleId !== 'calendar') {
          const matched = schedulesRes.data.find(s => String(s.id) === savedScheduleId);
          if (matched) {
            initialSchedule = matched;
          }
        }

        setActiveSchedule(initialSchedule);

        // if (schedulesRes.data.length > 0 && !activeSchedule) {
        //   const defaultSchedule = schedulesRes.data[0];
        //   setActiveSchedule(defaultSchedule);
        //   const newDate = new Date(defaultSchedule.start_date + 'T00:00:00');
        //   setCurrentDate(newDate);
        //   if (calendarRef.current) {
        //     const calendarApi = calendarRef.current.getApi();
        //     calendarApi.gotoDate(newDate);
        //   }

        //   // 🧠 Force refresh after setting active schedule
        //   await refreshShifts(defaultSchedule);
        // }

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
    const localStr = info.date.toLocaleDateString('en-CA');
    if (!activeSchedule || activeSchedule.isDefault) {
    // will become request off later
      setSelectedDate(localStr);
      setShowRequestOffModal(true);
      return;
    }
    if (!isCalendarAdmin || !activeSchedule) return;
    setSelectedDate(localStr);
    setShowShiftModal(true);
  };

  const handleScheduleSelect = (schedule) => {
    localStorage.setItem(`selectedScheduleId-${id}`, schedule.id ?? 'calendar');
    setActiveSchedule(schedule);

    if (schedule.start_date) {
      const newDate = new Date(`${schedule.start_date}T00:00:00`);
      setCurrentDate(newDate);
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.gotoDate(newDate);
      }
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
    console.log('🧠 clicked event:', info.event.extendedProps);
    const type = info.event.extendedProps?.type;

    if (type === 'timeoff') {
      const request = info.event.extendedProps.timeOffData;
      setSelectedTimeOff({
        ...request,
        calendar: id, // ✅ inject calendar ID from useParams()
      });
      setShowTimeOffModal(true);
      return;
    }

    if (type === 'holiday') {
      const holiday = info.event.extendedProps.holidayData;
      if (isCalendarAdmin || effectivePermissions.includes('manage_holidays')) {
        setSelectedHoliday(holiday);
        setShowHolidayModal(true);
      }
      return;
    }

    const shift = info.event.extendedProps.shiftData;
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

  const handleDeleteSchedule = async (schedule) => {
    try {
      await axios.delete(`/api/schedules/${schedule.id}/delete/`);
      setSchedules(prev => prev.filter(s => s.id !== schedule.id));
      if (activeSchedule?.id === schedule.id) {
        setActiveSchedule(null);
      }
    } catch (err) {
      console.error("Failed to delete schedule", err);
    }
  };

  function getDatesInRange(start, end) {
    const date = new Date(start);
    const dates = [];

    while (date <= end) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    return dates;
  }

  const handleCalendarRename = async (calendarId, newName) => {
    try {
      await axios.patch(`/api/calendars/${calendarId}/`, { name: newName });
      setCalendarName(newName);

      setActiveSchedule(prev =>
        prev?.isDefault ? { ...prev, name: newName } : prev
      );

      setSchedules(prev =>
      prev.map(s => s.isDefault ? { ...s, name: newName } : s)
    );

    } catch (err) {
      console.error('Rename failed:', err);
      throw err;
    }
  };

  const handleUpdateColor = async (calendarId, memberId, newColor) => {
    try {
      await axios.patch(`/api/calendars/${calendarId}/members/${memberId}/`, {
        color: newColor,
      });

      setMembers(prev =>
        prev.map(m =>
          m.id === memberId ? { ...m, color: newColor } : m
        )
      );

      // 🔁 Refresh shift events so color changes are reflected
      await refreshShifts();
    } catch (err) {
      console.error("Failed to update color:", err);
      throw err;
    }
  };

  const handleUpdateRole = async (calendarId, memberId, titleId) => {
    try {
      await axios.patch(`/api/calendars/${calendarId}/members/${memberId}/`, {
        title: titleId,
      });

      setMembers(prev =>
        prev.map(m =>
          m.id === memberId ? { ...m, title_id: titleId } : m
        )
      );
      await refreshShifts();
    } catch (err) {
      console.error("Failed to update role:", err);
      throw err;
    }
  };

  const handleUpdateSettings = async (calendarId, updatedFields) => {
    try {
      const res = await axios.patch(`/api/calendars/${calendarId}/`, updatedFields);
      console.log("we here");
      console.log("🔁 updated calendar:", res.data);
      setCalendar(prev => ({
        ...prev,
        ...res.data, // update calendar with backend-confirmed values
      }));
      //console.log("Saving self_role_change_allowed:", selfRoleChangeAllowed);
    } catch (err) {
      console.error('Failed to update calendar settings:', err);
    }
  };

  const filteredTimeOffs = timeOffRequests.filter((r) =>
    (r.status || '').toLowerCase() !== 'rejected'
  );





  return (
    <div className="flex p-6 min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex-1 mr-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
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
            <button className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600" onClick={() => setShowSettingsModal(true)}><SettingsIcon/></button>
            {isCalendarAdmin && (
            <button
              className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
              onClick={() => navigate(`/calendar/${id}/admin`)}
            >
              Admin Panel
            </button>
          )}
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

              if (!activeSchedule?.isDefault) {
                const holiday = workplaceHolidays.find(h => {
                  const start = new Date(h.date);
                  const end = h.end_date ? new Date(h.end_date) : new Date(start);
                  end.setDate(end.getDate() + 1);
                  return cellDate >= start && cellDate < end;
                });

                if (holiday) {
                  if (holiday.type === 'custom') {
                    classes.push('altered-cell');
                  } else if (holiday.type === 'off') {
                    classes.push('holiday-cell');
                  }
                }
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
              timeOffRequests={filteredTimeOffs}
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
                <ScheduleCard
                  key={schedule.id + schedule.name + schedule.start_date + schedule.end_date}
                  schedule={schedule}
                  isActive={activeSchedule?.id === schedule.id}
                  onSelect={handleScheduleSelect}
                  isAdmin={isCalendarAdmin}
                  onEdit={(s) => {
                    setEditingSchedule(s);
                    setShowScheduleModal(true);
                  }}
                  onDelete={handleDeleteSchedule}
                />
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
          timeOffRequests={filteredTimeOffs}
          scheduleId={activeSchedule?.id}
          selectedDate={selectedDate}
          members={members}
          workplaceHolidays={workplaceHolidays}
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
      {showRequestOffModal && (
        <RequestOffModal
          isOpen={showRequestOffModal}
          onClose={() => setShowRequestOffModal(false)}
          calendarId={id}
          isAdmin={isCalendarAdmin}
          onRequestSubmitted={async (updatedHolidays = null) => {
          const timeOffRes = await axios.get(`/api/calendars/${id}/timeoff/`);
            setTimeOffRequests(timeOffRes.data);
            if (updatedHolidays) {
              setWorkplaceHolidays(updatedHolidays);
              await refreshShifts(activeSchedule, timeOffRes.data, updatedHolidays); // ✅ ensure fresh data flows through
            } else {
              await refreshShifts(activeSchedule, timeOffRes.data);
            }
          }}
          selectedDate={selectedDate}
        />
      )}
      {showTimeOffModal && selectedTimeOff && (
        <TimeOffModal
          calendarId={id}
          isOpen={showTimeOffModal}
          onClose={() => {
            setShowTimeOffModal(false);
            setSelectedTimeOff(null);
          }}
          timeOff={selectedTimeOff}
          currentUserId={currentUserId}
          onDelete={async () => {
            setShowTimeOffModal(false);
            const res = await axios.get(`/api/calendars/${id}/timeoff/`);
            setTimeOffRequests(res.data);
            await refreshShifts(activeSchedule, res.data);
          }}
        />
      )}
      {showSettingsModal && (
        <CalendarSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          calendar={{ id, name: calendarName, ...calendar }}
          members={members}
          roles={calendarRoles}
          currentUserId={currentUserId}
          onRename={handleCalendarRename}
          onUpdateColor={handleUpdateColor}
          onUpdateRole={handleUpdateRole}
          onUpdateSettings={handleUpdateSettings}
          currentMember={members.find((m) => m.id === currentUserId)}
        />
      )}
      <HolidayModal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        holiday={selectedHoliday}
        calendarId={id}
        isAdmin={isCalendarAdmin}
        effectivePermissions={effectivePermissions}
        onUpdateHoliday={async (updated) => {
          const holidaysRes = await axios.get(`/api/calendars/${id}/holidays/`);
          setWorkplaceHolidays(holidaysRes.data);
          await refreshShifts(activeSchedule, timeOffRequests, holidaysRes.data);
        }}
        onDeleteHoliday={async (deletedId) => {
          const holidaysRes = await axios.get(`/api/calendars/${id}/holidays/`);
          setWorkplaceHolidays(holidaysRes.data);
          await refreshShifts(activeSchedule, timeOffRequests, holidaysRes.data);
          setShowHolidayModal(false);
        }}
      />
      {showScheduleModal && (
        <ScheduleCreateModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingSchedule(null);
          }}
          calendarId={id}
          mode={editingSchedule ? 'edit' : 'create'}
          existingSchedule={editingSchedule}
          onCreate={(schedule) => {
            setSchedules(prev => [...prev, schedule]);
            setActiveSchedule(schedule);
            const newDate = new Date(schedule.start_date + 'T00:00:00');
            setCurrentDate(newDate);
            if (calendarRef.current) {
              calendarRef.current.getApi().gotoDate(newDate);
            }
          }}
          onUpdate={async (updated) => {
          try {
            const res = await axios.get(`/api/schedules/`, { params: { calendar_id: id } });
            // setSchedules(res.data);
            const defaultSchedule = schedules.find(s => s.id === null);
            setSchedules([defaultSchedule, ...res.data]);
            const fresh = res.data.find(s => s.id === updated.id);
            if (fresh) {
              setActiveSchedule(fresh);
              const newDate = new Date(fresh.start_date + 'T00:00:00');
              setCurrentDate(newDate);
              if (calendarRef.current) {
                calendarRef.current.getApi().gotoDate(newDate);
              }
            }
          } catch (err) {
            console.error("Failed to refresh schedules after update", err);
          }
        }}
        />
      )}
    </div>
  );
}
