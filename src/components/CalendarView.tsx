"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { EventRecord } from "@/hooks/useEvents";

type CalendarViewProps = {
  events: EventRecord[];
  onSelectEvent?: (event: EventRecord) => void;
};

export default function CalendarView({ events, onSelectEvent }: CalendarViewProps) {
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start_at,
      })),
    [events],
  );

  return (
    <div className="calendar-theme rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates
        dayMaxEvents={2}
        displayEventTime={false}
        events={calendarEvents}
        eventClick={(info) => {
          if (!onSelectEvent) return;
          const matched = events.find((item) => item.id === info.event.id);
          if (matched) onSelectEvent(matched);
        }}
      />
    </div>
  );
}
