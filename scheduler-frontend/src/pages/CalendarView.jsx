// src/pages/CalendarView.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { useEffect, useState } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import axios from '../utils/axios';
// import '../index.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function CustomDateCellWrapper({ children, value }) {
  const isToday = new Date().toDateString() === new Date(value).toDateString();
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Return the original component, with only style changed
  return React.cloneElement(children, {
    ...children.props,
    style: {
      ...children.props.style,
      color: isToday && isDark ? 'black' : children.props.style?.color,
    },
  });
}


export default function CalendarView() {
  const { id } = useParams(); // calendar ID from URL
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const res = await axios.get(`/api/schedules/${id}/shifts/`);
        const formatted = res.data.map((shift) => ({
          id: shift.id,
          title: `${shift.employee_name} - ${shift.position}`,
          start: new Date(shift.start_time),
          end: new Date(shift.end_time),
          color: shift.color || '#8b5cf6', // fallback to a purple tone
        }));
        setEvents(formatted);
      } catch (err) {
        console.error('Error loading shifts', err);
      }
    };
    fetchShifts();
  }, [id]);

  const eventStyleGetter = (event) => {
    const backgroundColor = event.color;
    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        color: 'white',
        border: 'none',
        display: 'block',
        fontWeight: '500',
        padding: '4px 8px',
      },
    };
  };

 useEffect(() => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const patchTodayText = () => {
    const bgEls = Array.from(document.querySelectorAll('.rbc-day-bg'));
    const btnEls = Array.from(document.querySelectorAll('.rbc-date-cell .rbc-button-link'));

    const todayIndex = bgEls.findIndex(el => el.classList.contains('rbc-today'));

    if (todayIndex >= 0 && btnEls[todayIndex] && isDark) {
      btnEls[todayIndex].style.color = 'black';
      console.log(`✅ Patched button at column ${todayIndex}`);
    }
  };

  patchTodayText();
  const interval = setInterval(patchTodayText, 500);

  return () => clearInterval(interval);
}, []);






  return (
    <div className="p-6 min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Calendar View</h1>
      <div className="test-rule">Test</div>
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          eventPropGetter={eventStyleGetter}
          messages={{
            week: 'Week',
            day: 'Day',
            month: 'Month',
            agenda: 'Agenda',
            today: 'Today',
            previous: 'Back',
            next: 'Next'
          }}
          components={{
            toolbar: (props) => (
              <div className="flex justify-between items-center mb-4">
                <div>
                  <button onClick={() => props.onNavigate('PREV')} className="px-2 py-1 rounded text-gray-800 dark:text-white">Back</button>
                  <button onClick={() => props.onNavigate('NEXT')} className="ml-2 px-2 py-1 rounded text-gray-800 dark:text-white">Next</button>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{props.label}</h2>
                <div>
                  <button onClick={() => props.onView('day')} className="px-2 py-1 rounded text-gray-800 dark:text-white">Day</button>
                  <button onClick={() => props.onView('week')} className="ml-2 px-2 py-1 rounded text-gray-800 dark:text-white">Week</button>
                  <button onClick={() => props.onView('month')} className="ml-2 px-2 py-1 rounded text-gray-800 dark:text-white">Month</button>
                </div>
              </div>
            ),
            dateCellWrapper: CustomDateCellWrapper,
          }}
        />
      </div>
    </div>
  );
}
