// src/pages/CalendarView.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import axios from '../utils/axios';
import ShiftCreateModal from '../components/ShiftCreateModal';
import ScheduleCreateModal from '../components/ScheduleCreateModal';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  const normalize = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };

  useEffect(() => {
    const fetchShifts = async () => {
      if (!activeSchedule) return;
      try {
        const res = await axios.get(`/api/schedules/${activeSchedule.id}/shifts/`);
        const formatted = res.data.map((shift) => ({
          id: shift.id,
          title: `${shift.employee_name} - ${shift.position}`,
          start: new Date(shift.start_time),
          end: new Date(shift.end_time),
          color: shift.color || '#8b5cf6',
        }));
        setEvents(formatted);
      } catch (err) {
        console.error('Error loading shifts', err);
      }
    };
    fetchShifts();
  }, [activeSchedule]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await axios.get(`/api/calendars/${id}/members/`);
        setMembers(res.data);
      } catch (err) {
        console.error('Error loading members', err);
      }
    };

    const fetchSchedules = async () => {
      try {
        const res = await axios.get('/api/schedules/', {
          params: { calendar_id: id },
        });
        setSchedules(res.data);
      } catch (err) {
        console.error("Failed to fetch schedules", err);
      }
    };

    fetchMembers();
    fetchSchedules();
  }, [id]);

  const handleSlotSelect = (slotInfo) => {
    const clicked = new Date(slotInfo.start);
    const slotTime = clicked.setHours(0, 0, 0, 0);
    const start = normalize(activeSchedule.start_date);
    const end = normalize(activeSchedule.end_date);

    if (slotTime < start || slotTime > end) {
      alert('Selected date is outside the active schedule range.');
      return;
    }

    setSelectedDate(clicked);
    setShowShiftModal(true);
  };

  const handleScheduleSelect = (schedule) => {
    setActiveSchedule(schedule);
    setCurrentDate(new Date(schedule.start_date + 'T00:00:00'));
  };

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.color,
      borderRadius: '8px',
      color: 'white',
      border: 'none',
      display: 'block',
      fontWeight: '500',
      padding: '4px 8px',
    },
  });

  useEffect(() => {
    const checkDark = () =>
      setIsDarkMode(document.documentElement.classList.contains('dark'));

    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const patchTodayText = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const bgEls = Array.from(document.querySelectorAll('.rbc-day-bg'));
      const btnEls = Array.from(document.querySelectorAll('.rbc-date-cell .rbc-button-link'));
      const todayIndex = bgEls.findIndex(el => el.classList.contains('rbc-today'));

      if (todayIndex >= 0 && btnEls[todayIndex] && isDark) {
        btnEls[todayIndex].style.color = 'black';
        bgEls[todayIndex].style.backgroundColor = '#d6c1ff';
      }
    };

    patchTodayText();
    const interval = setInterval(patchTodayText, 500);
    return () => clearInterval(interval);
  }, []);

  const dayPropGetter = (date) => {
    if (!activeSchedule) return {};

    const normalizedDate = date.setHours(0, 0, 0, 0);
    const start = normalize(activeSchedule.start_date);
    const end = normalize(activeSchedule.end_date);
    const isToday = normalizedDate === new Date().setHours(0, 0, 0, 0);

    if (normalizedDate < start || normalizedDate > end) {
      return {
        style: {
          backgroundColor: isDarkMode ? '#4b5563' : '#ababab',
          opacity: 0.5,
          pointerEvents: 'none',
          color: isDarkMode ? '#d1d5db' : '#6b7280',
        },
      };
    }

    if (!isToday) {
      return {
        style: {
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#111827',
        },
      };
    }

    return {};
  };

  return (
    <div className="flex p-6 min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex-1 mr-6">
        <h1 className="text-2xl font-bold mb-4">
          Calendar View {activeSchedule && `— ${activeSchedule.name}`}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            selectable
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectSlot={handleSlotSelect}
            style={{ height: 600 }}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
          />
        </div>
      </div>

      <div className="w-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-bold mb-4">Schedules</h2>
        <ul className="space-y-2">
          {schedules.map(schedule => (
            <li key={schedule.id}>
              <button
                onClick={() => handleScheduleSelect(schedule)}
                className={`w-full text-left px-3 py-2 rounded ${
                  activeSchedule?.id === schedule.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
                }`}
              >
                {`${new Date(schedule.start_date + 'T00:00:00').toLocaleDateString()} - ${new Date(
                  schedule.end_date + 'T00:00:00'
                ).toLocaleDateString()}`}
              </button>
            </li>
          ))}
        </ul>
        <button
          className="mt-4 w-full bg-purple-500 dark:bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-500"
          onClick={() => setShowScheduleModal(true)}
        >
          + Create Schedule
        </button>
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
            setEvents((prev) => [...prev, {
              ...newShift,
              start: new Date(newShift.start_time),
              end: new Date(newShift.end_time),
              color: newShift.color,
              title: `${newShift.employee_name} - ${newShift.position}`,
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
            setSchedules(prev => [...prev, schedule]);
            setActiveSchedule(schedule);
            setCurrentDate(new Date(schedule.start_date + 'T00:00:00'));
            setShowScheduleModal(false);
          }}
          calendarId={id}
        />
      )}
    </div>
  );
}
