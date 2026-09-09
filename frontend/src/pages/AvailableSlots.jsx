import React, { useEffect, useMemo, useState } from "react";
import "./AvailableSlots.css";

// How many days ahead (including today) are offered for booking.
const BOOKING_WINDOW_DAYS = 30;

// Daily visiting hours + interval for the generated time slots.
// Edit these to match your real hours. End hour is exclusive
// (DAY_END_HOUR = 21 means the last slot generated is 08:45 PM).
const DAY_START_HOUR = 9; // 9:00 AM
const DAY_END_HOUR = 21; // 9:00 PM
const SLOT_INTERVAL_MINUTES = 15;

// This page reads the logged-in user from sessionStorage, matching every
// other page in the app (Login.jsx, App.jsx routing, BookVisit.jsx,
// MyBookings.jsx, MyProfile.jsx, SecurityDashboard.jsx, user.jsx).
//
// NOTE: this version makes NO backend calls for dates or times — both
// "/api/slots/dates" and "/api/slots" returned 404 on your server, so
// the calendar window and the daily time list are both generated
// entirely in the browser:
//   - Dates: today -> +BOOKING_WINDOW_DAYS
//   - Times: DAY_START_HOUR -> DAY_END_HOUR, every SLOT_INTERVAL_MINUTES
//   - If the selected date is today, times that have already passed are
//     shown greyed out and disabled (NOT hidden) — the grid always has
//     something to look at, it just can't be clicked if it's in the past.
//
// The "reason for visit" is only asked once — on the booking page
// (Visit Details / Purpose of Visit), not here. This page's job is just
// picking date + time, then handing off to /user/book.
//
// Flow:
//   1. Calendar shows a rolling window of dates.
//   2. Click a date -> that date's time list is shown below. The
//      calendar stays open so the date can be changed at any time.
//   3. Click an available time slot -> a confirmation panel opens
//      showing the chosen date + time, with a "Confirm Booking" button.
//   4. "Confirm Booking" -> user is sent to /user/book with date + time,
//      where they fill in the purpose of visit and finish booking.
//   5. "My Bookings" button in the topbar -> /user/bookings.

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function todayDateKey() {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDateKey(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatMinutesAsTime(totalMinutes) {
  let hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";

  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  const mm = String(minute).padStart(2, "0");
  return `${hour12}:${mm} ${period}`;
}

// Every time slot for one day, e.g. "09:00 AM", "09:15 AM", "09:30 AM"...
// This ALWAYS returns the full list — filtering for "already passed" is
// done separately at render time, never by shrinking this array, so the
// grid never silently ends up empty.
function buildDailyTimeSlots() {
  const slots = [];
  const startMinutes = DAY_START_HOUR * 60;
  const endMinutes = DAY_END_HOUR * 60;

  for (let t = startMinutes; t < endMinutes; t += SLOT_INTERVAL_MINUTES) {
    slots.push({ label: formatMinutesAsTime(t), minutesFromMidnight: t });
  }

  return slots;
}

// Builds a Set of "YYYY-MM-DD" strings for today through `days` ahead.
function buildDateWindow(days) {
  const set = new Set();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    set.add(toDateKey(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  return set;
}

// Simple month-view calendar. `availableDates` is a Set of "YYYY-MM-DD"
// strings — only those days are clickable. Everything else is greyed out.
function Calendar({ availableDates, selectedDate, onSelectDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const monthLabel = firstOfMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const goPrevMonth = () => {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(prev.getFullYear());
    setViewMonth(prev.getMonth());
  };

  const goNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button
          type="button"
          className="calendar-nav__btn"
          onClick={goPrevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="calendar-nav__label">{monthLabel}</span>
        <button
          type="button"
          className="calendar-nav__btn"
          onClick={goNextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`blank-${index}`} className="calendar-cell calendar-cell--blank" />;
          }

          const dateKey = toDateKey(viewYear, viewMonth, day);
          const isAvailable = availableDates.has(dateKey);
          const isSelected = dateKey === selectedDate;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!isAvailable}
              className={[
                "calendar-cell",
                isAvailable ? "calendar-cell--available" : "calendar-cell--disabled",
                isSelected ? "calendar-cell--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(dateKey)}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span className="legend-dot legend-dot--available" /> Open
        <span className="legend-dot legend-dot--selected" /> Selected
      </div>
    </div>
  );
}

function AvailableSlots() {
  const storedUser = sessionStorage.getItem("user");

  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Invalid stored user:", error);
  }

  // Generated once on mount — no backend call involved.
  const availableDatesSet = useMemo(() => buildDateWindow(BOOKING_WINDOW_DAYS), []);
  const dailySlots = useMemo(() => buildDailyTimeSlots(), []);

  const [selectedDate, setSelectedDate] = useState(() => {
    const first = availableDatesSet.values().next().value;
    return first || "";
  });

  const [selectedTime, setSelectedTime] = useState("");

  // Re-computed every minute so "already passed" stays accurate without
  // needing a page refresh, but never touches the slot list itself.
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Clear any in-progress time selection whenever the date changes, so a
  // stale confirmation panel never lingers on the wrong date.
  useEffect(() => {
    setSelectedTime("");
  }, [selectedDate]);

  const isSelectedDateToday = selectedDate === todayDateKey();

  const handleBack = () => {
    window.location.href = "/user";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleMyBookings = () => {
    if (!user) {
      alert("Please login first");
      window.location.href = "/login";
      return;
    }
    window.location.href = "/user/bookings";
  };

  const formatDateLabel = (value) => {
    const parsed = parseDateKey(value);
    if (!parsed) return value;

    return parsed.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const formatDateLong = (value) => {
    const parsed = parseDateKey(value);
    if (!parsed) return value;

    return parsed.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Selecting a date just updates state — the calendar stays visible so
  // the user can pick a different date at any time.
  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey);
  };

  const handleSlotClick = (time) => {
    if (!user) {
      alert("Please login first");
      window.location.href = "/login";
      return;
    }

    setSelectedTime(time);
  };

  // Lets the user pick a different time without losing their date.
  const handleChangeTime = () => {
    setSelectedTime("");
  };

  // Reason for visit is collected once, on the booking page — this just
  // hands off the chosen date + time.
  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedTime) {
      return;
    }

    const params = new URLSearchParams({
      date: selectedDate,
      time: selectedTime,
    });

    window.location.href = `/user/book?${params.toString()}`;
  };

  return (
    <div className="slots-page">
      <header className="slots-topbar">
        <button
          type="button"
          className="back-button"
          onClick={handleBack}
          aria-label="Back"
        >
          ←
        </button>

        <div className="slots-brand">Shnool International LLC</div>

        <div className="slots-topbar__actions">
          <button
            type="button"
            className="slots-my-bookings"
            onClick={handleMyBookings}
          >
            My Bookings
          </button>
          <button type="button" className="slots-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="slots-container">
        <div className="slots-header">
          <span className="page-label">VISITOR PORTAL</span>
          <h1>Available Slots</h1>
          <p>Pick a date on the calendar, then choose a time to book your visit.</p>
        </div>

        <section className="slots-card">
          <div className="card-header">
            <span className="section-label">STEP 1</span>
            <h2>Choose a date</h2>
          </div>

          <Calendar
            availableDates={availableDatesSet}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        </section>

        {selectedDate && (
          <section className="slots-card">
            <div className="card-header">
              <span className="section-label">STEP 2</span>
              <h2>Choose a time</h2>
              <p>Showing slots for {formatDateLabel(selectedDate)}</p>
            </div>

            <div className="time-grid">
              {dailySlots.map((slot) => {
                const isPast = isSelectedDateToday && slot.minutesFromMidnight <= nowMinutes;

                return (
                  <button
                    key={slot.label}
                    type="button"
                    disabled={isPast}
                    className={`time-slot ${
                      selectedTime === slot.label ? "time-slot--active" : ""
                    }`}
                    onClick={() => handleSlotClick(slot.label)}
                  >
                    {slot.label}
                    {isPast && <span className="time-slot__full">Passed</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {selectedDate && selectedTime && (
          <section className="slots-card">
            <div className="card-header">
              <span className="section-label">STEP 3</span>
              <h2>Confirm your visit</h2>
            </div>

            <div className="confirm-summary">
              <div className="confirm-summary__row">
                <span className="confirm-summary__label">Date</span>
                <span className="confirm-summary__value">
                  {formatDateLong(selectedDate)}
                </span>
              </div>
              <div className="confirm-summary__row">
                <span className="confirm-summary__label">Time</span>
                <span className="confirm-summary__value">{selectedTime}</span>
              </div>
              <button
                type="button"
                className="confirm-summary__change"
                onClick={handleChangeTime}
              >
                Change time
              </button>
            </div>

            <button
              type="button"
              className="confirm-booking-btn"
              onClick={handleConfirmBooking}
            >
              Confirm Booking
            </button>
          </section>
        )}
      </main>

      <footer className="slots-footer">
        <span>Shnool International LLC</span>
        <span>Visitor Management System</span>
      </footer>
    </div>
  );
}

export default AvailableSlots;