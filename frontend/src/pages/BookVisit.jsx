import React, { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./bookvisit.css";
import { API_BASE } from "../services/api";


const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function BookVisit() {
  const storedUser = sessionStorage.getItem("user");

  const user = storedUser ? JSON.parse(storedUser) : null;

  // ----- Calendar / slot picking state -----
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [availableDates, setAvailableDates] = useState(null);
  const [datesError, setDatesError] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  // If arriving from a link with ?date=&time= already set, skip straight
  // to the purpose/confirm step instead of showing the picker again.
  const [pickerOpen, setPickerOpen] = useState(true);

  const [purpose, setPurpose] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedDate = params.get("date");
    const selectedTime = params.get("time");

    if (selectedDate && selectedTime) {
      setDate(selectedDate);
      setTime(selectedTime);
      setPickerOpen(false);
    }
  }, []);

  // Load which dates are open for booking.
  useEffect(() => {
    let cancelled = false;

    async function loadDates() {
      try {
        setDatesError("");
        const response = await fetch(`${API_BASE}/api/slots/dates`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load available dates");
        }

        const list = Array.isArray(data.dates) ? data.dates : [];

        if (!cancelled) {
          setAvailableDates(new Set(list));
        }
      } catch (error) {
        console.error("Load dates error:", error);
        if (!cancelled) {
          setAvailableDates(new Set());
          setDatesError(error.message || "Unable to load available dates");
        }
      }
    }

    loadDates();
    return () => { cancelled = true; };
  }, []);

  // Load time slots whenever the chosen date changes (while picker is open).
  useEffect(() => {
    if (!date || !pickerOpen) {
      return;
    }

    let cancelled = false;

    async function loadSlots() {
      try {
        setSlotsLoading(true);
        setSlotsError("");

        const response = await fetch(
          `${API_BASE}/api/slots?date=${encodeURIComponent(date)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load time slots");
        }

        if (!cancelled) {
          setSlots(Array.isArray(data.slots) ? data.slots : []);
        }
      } catch (error) {
        console.error("Load slots error:", error);
        if (!cancelled) {
          setSlots([]);
          setSlotsError(error.message || "Unable to load time slots");
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    loadSlots();
    return () => { cancelled = true; };
  }, [date, pickerOpen]);

  // ----- Calendar grid -----
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(viewYear, viewMonth, day));
    }
    return cells;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  };

  const goToNextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  };

  const isDateSelectable = (d) => {
    if (!d) return false;
    if (startOfDay(d) < today) return false;
    if (!availableDates) return false;
    return availableDates.has(toIsoDate(d));
  };

  const handlePickDate = (d) => {
    const iso = toIsoDate(d);
    setDate(iso);
    setTime(""); // reset time when date changes
  };

  const formatDateLabel = (isoValue) => {
    const match = String(isoValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return isoValue;
    const [, year, month, day] = match;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString("en-IN", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
  };

  const handlePickTime = (selectedTime) => {
    setTime(selectedTime);
    setPickerOpen(false); // move on to the purpose/confirm step
  };

  const handleChangeSlot = () => {
    setPickerOpen(true);
    setTime("");
  };

  const handleBack = () => {
    if (pickerOpen) {
      window.location.href = "/user";
    } else {
      handleChangeSlot();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleBooking = async (event) => {
    event.preventDefault();

    if (!user) {
      alert("Please login first");
      window.location.href = "/login";
      return;
    }

    if (!date) { alert("Please select a date"); return; }
    if (!time) { alert("Please select a time"); return; }
    if (!purpose.trim()) { alert("Please enter the purpose of your visit"); return; }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          visit_date: date,
          visit_time: time,
          purpose: purpose.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Booking failed");
        return;
      }

      // The booking now exists on the backend, so:
      //  - this slot will come back marked unavailable (crossed out) the
      //    next time /api/slots is fetched for this date, and
      //  - it will show up in My Bookings, since that page fetches every
      //    booking for this user_id from the same backend.
      setBooking(data.booking);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Cannot connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const qrValue = booking
    ? JSON.stringify({
        booking_id: booking.id,
        user_id: booking.user_id,
        visit_date: booking.visit_date,
        visit_time: booking.visit_time,
      })
    : "";

  // ----- Success screen -----
  if (booking) {
    return (
      <div className="book-page">
        <div className="book-container">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <span className="page-label">VISITOR PORTAL</span>
            <h1>Visit Confirmed</h1>
            <p className="success-description">
              Your visit has been successfully booked.
            </p>

            <div className="booking-summary">
              <div className="summary-row">
                <span>Visitor</span>
                <strong>{user?.full_name || "User"}</strong>
              </div>
              <div className="summary-row">
                <span>Date</span>
                <strong>{booking.visit_date}</strong>
              </div>
              <div className="summary-row">
                <span>Time</span>
                <strong>{booking.visit_time}</strong>
              </div>
              <div className="summary-row">
                <span>Purpose</span>
                <strong>{booking.purpose}</strong>
              </div>
              <div className="summary-row">
                <span>Booking ID</span>
                <strong>#{booking.id}</strong>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <strong>{booking.status || "Pending"}</strong>
              </div>
            </div>

            <div className="qr-section">
              <span className="qr-label">SECURITY QR</span>
              <h2>Your Visit QR Code</h2>
              <div className="qr-box">
                <QRCodeCanvas
                  value={qrValue}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="H"
                  includeMargin={true}
                />
              </div>
              <h3>Show this QR at security</h3>
              <p>Security can scan this QR code to verify your booking.</p>
            </div>

            <div className="success-actions">
              <button type="button" onClick={() => { window.location.href = "/user/bookings"; }}>
                My Bookings
              </button>
              <button type="button" onClick={() => { window.location.href = "/user"; }}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- Picker screen: calendar + time slots -----
  if (pickerOpen) {
    return (
      <div className="book-page">
        <header className="book-topbar">
          <button type="button" className="back-button" onClick={handleBack} aria-label="Back">←</button>
          <div className="book-brand">Shnool International LLC</div>
          <button type="button" className="book-logout" onClick={handleLogout}>Logout</button>
        </header>

        <main className="book-container">
          <div className="book-header">
            <span className="page-label">VISITOR PORTAL</span>
            <h1>Book a Visit</h1>
            <p>Pick a date and time to book your visit.</p>
          </div>

          {datesError && <div className="empty-note">{datesError}</div>}

          <section className="booking-card">
            <div className="calendar-nav">
              <button type="button" className="calendar-nav__button" onClick={goToPrevMonth} aria-label="Previous month">‹</button>
              <span className="calendar-nav__label">{MONTH_LABELS[viewMonth]} {viewYear}</span>
              <button type="button" className="calendar-nav__button" onClick={goToNextMonth} aria-label="Next month">›</button>
            </div>

            <div className="calendar-weekdays">
              {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
            </div>

            <div className="calendar-grid">
              {calendarCells.map((d, index) => {
                if (!d) return <div key={`blank-${index}`} className="calendar-cell calendar-cell--blank" />;

                const iso = toIsoDate(d);
                const selectable = isDateSelectable(d);
                const isSelected = iso === date;
                const isToday = iso === toIsoDate(today);

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!selectable}
                    onClick={() => handlePickDate(d)}
                    className={[
                      "calendar-cell",
                      selectable ? "calendar-cell--selectable" : "calendar-cell--disabled",
                      isSelected ? "calendar-cell--selected" : "",
                      isToday ? "calendar-cell--today" : "",
                    ].join(" ").trim()}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </section>

          {date && (
            <section className="booking-card">
              <div className="card-header">
                <span className="section-label">TIME SLOTS</span>
                <h2>{formatDateLabel(date)}</h2>
                <p>Crossed-out times are already booked.</p>
              </div>

              {slotsLoading && <div className="empty-note">Loading time slots…</div>}
              {!slotsLoading && slotsError && <div className="empty-note">{slotsError}</div>}
              {!slotsLoading && !slotsError && slots && slots.length === 0 && (
                <div className="empty-note">No time slots are configured for this date.</div>
              )}

              {!slotsLoading && !slotsError && slots && slots.length > 0 && (
                <div className="time-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      className={`time-slot ${!slot.available ? "time-slot--booked" : ""}`}
                      disabled={!slot.available}
                      onClick={() => handlePickTime(slot.time)}
                    >
                      <span className="time-slot__text">{slot.time}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <footer className="book-footer">
          <span>Shnool International LLC</span>
          <span>Visitor Management System</span>
        </footer>
      </div>
    );
  }

  // ----- Purpose / confirm screen -----
  return (
    <div className="book-page">
      <header className="book-topbar">
        <button type="button" className="back-button" onClick={handleBack} aria-label="Back">←</button>
        <div className="book-brand">Shnool International LLC</div>
        <button type="button" className="book-logout" onClick={handleLogout}>Logout</button>
      </header>

      <main className="book-container">
        <div className="book-header">
          <span className="page-label">VISITOR PORTAL</span>
          <h1>Book a Visit</h1>
          <p>Complete your visit details to confirm your appointment.</p>
        </div>

        <section className="booking-card">
          <div className="card-header">
            <span className="section-label">NEW BOOKING</span>
            <h2>Visit Details</h2>
            <p>Your selected date and time are taken from the calendar.</p>
          </div>

          <form onSubmit={handleBooking}>
            <div className="form-group">
              <label htmlFor="date">Visit Date</label>
              <input id="date" type="text" value={formatDateLabel(date)} readOnly />
              <small>
                Selected from calendar —{" "}
                <button type="button" className="change-slot-link" onClick={handleChangeSlot}>
                  change
                </button>
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="time">Visit Time</label>
              <input id="time" type="text" value={time} readOnly />
              <small>15-minute appointment slot</small>
            </div>

            <div className="form-group">
              <label htmlFor="purpose">Purpose of Visit</label>
              <textarea
                id="purpose"
                placeholder="Why are you visiting?"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                rows="5"
              />
            </div>

            <button type="submit" className="booking-submit" disabled={loading}>
              {loading ? "Confirming Visit..." : "Confirm Visit"}
            </button>
          </form>
        </section>

        <section className="booking-info">
          <div className="info-number">15</div>
          <div>
            <h3>15-minute appointment</h3>
            <p>Your selected time is reserved for this booking.</p>
          </div>
        </section>
      </main>

      <footer className="book-footer">
        <span>Shnool International LLC</span>
        <span>Visitor Management System</span>
      </footer>
    </div>
  );
}

export default BookVisit;