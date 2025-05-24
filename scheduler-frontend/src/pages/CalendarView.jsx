// src/pages/CalendarView.jsx
import { useParams } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { useEffect, useState } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import axios from '../utils/axios';

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
        }));
        setEvents(formatted);
      } catch (err) {
        console.error('Error loading shifts', err);
      }
    };
    fetchShifts();
  }, [id]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendar View</h1>
      <div className="bg-white rounded shadow p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
        />
      </div>
    </div>
  );
}
