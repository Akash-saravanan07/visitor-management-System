import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import { QRCodeCanvas } from "qrcode.react";

import "./MyBookings.css";
import { API_BASE } from "../services/api";


// FIX: sessionStorage instead of localStorage — each tab now keeps its
// own independent login instead of sharing/overwriting one across tabs.

function MyBookings() {

  const [bookings, setBookings] = useState([]);

  const [filter, setFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [cancellingId, setCancellingId] =
    useState(null);

  const [visibleQrIds, setVisibleQrIds] =
    useState(() => new Set());

  const toggleQr = (bookingId) => {

    setVisibleQrIds((current) => {

      const next = new Set(current);

      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }

      return next;

    });

  };

  const storedUser =
    sessionStorage.getItem("user");

  let user = null;

  try {

    user = storedUser
      ? JSON.parse(storedUser)
      : null;

  } catch (error) {

    console.error(
      "Invalid stored user:",
      error
    );

  }

  const userId =
    user?.id ||
    user?.user_id;

  const sortByMostRecent = (list) => {

    return [...list].sort((a, b) => {

      const timeA =
        new Date(
          a.created_at || 0
        ).getTime();

      const timeB =
        new Date(
          b.created_at || 0
        ).getTime();

      if (timeB !== timeA) {
        return timeB - timeA;
      }

      return Number(b.id) - Number(a.id);

    });

  };

  const loadBookings = async () => {

    if (!userId) {

      setError(
        "User session not found. Please login again."
      );

      setLoading(false);

      return;
    }

    try {

      setLoading(true);

      setError("");

      const response = await fetch(
        `${API_BASE}/api/bookings/user/${userId}`
      );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
            "Unable to load bookings"
        );

      }

      const loadedBookings =
        Array.isArray(data.bookings)
          ? data.bookings
          : [];

      setBookings(
        sortByMostRecent(loadedBookings)
      );

    } catch (error) {

      console.error(
        "Load bookings error:",
        error
      );

      setError(
        error.message ||
          "Unable to load bookings"
      );

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {

    loadBookings();

  }, [userId]);

  const handleCancel = async (
    bookingId
  ) => {

    if (cancellingId !== null) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to cancel this booking?"
      );

    if (!confirmed) {
      return;
    }

    try {

      setCancellingId(bookingId);

      const response =
        await fetch(
          `${API_BASE}/api/bookings/${bookingId}/cancel`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              user_id: userId
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
            "Unable to cancel booking"
        );

      }

      setBookings((current) =>
        current.map((booking) => {

          if (
            Number(booking.id) ===
            Number(bookingId)
          ) {

            return {
              ...booking,
              status: "CANCELLED"
            };

          }

          return booking;

        })
      );

    } catch (error) {

      console.error(
        "Cancel booking error:",
        error
      );

      alert(
        error.message ||
          "Unable to cancel booking"
      );

    } finally {

      setCancellingId(null);

    }
  };

  const filteredBookings =
    useMemo(() => {

      if (filter === "ALL") {
        return bookings;
      }

      return bookings.filter(
        (booking) => {

          const status =
            String(
              booking.status || ""
            ).toUpperCase();

          return status === filter;

        }
      );

    }, [bookings, filter]);

  const formatDate = (value) => {

    if (!value) {
      return "";
    }

    const match =
      String(value).match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    if (match) {

      const [
        ,
        year,
        month,
        day
      ] = match;

      const date =
        new Date(
          Number(year),
          Number(month) - 1,
          Number(day)
        );

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );

    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(value);

    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  };

  const getStatusText = (
    status
  ) => {

    const value =
      String(
        status || ""
      ).toUpperCase();

    if (value === "APPROVED") {
      return "Approved";
    }

    if (value === "COMPLETED") {
      return "Finished";
    }

    if (
      value === "CANCELLED" ||
      value === "CANCELED"
    ) {

      return "Cancelled";

    }

    return "Pending";
  };

  const getStatusClass = (
    status
  ) => {

    const value =
      String(
        status || ""
      ).toUpperCase();

    if (value === "APPROVED") {
      return "approved";
    }

    if (value === "COMPLETED") {
      return "finished";
    }

    if (
      value === "CANCELLED" ||
      value === "CANCELED"
    ) {

      return "cancelled";

    }

    return "pending";
  };

  const handleBack = () => {

    window.location.href =
      "/user";

  };

  const getQrValue = (
    booking
  ) => {

    return JSON.stringify({

      booking_id:
        booking.id,

      booking_token:
        booking.booking_token,

      user_id:
        booking.user_id,

      visit_date:
        booking.visit_date,

      visit_time:
        booking.visit_time,

      status:
        booking.status

    });

  };

  return (

    <div className="my-bookings-page">

      <header className="my-bookings-header">

        <button
          type="button"
          className="back-button"
          onClick={handleBack}
        >
          ←
        </button>

        <div className="header-content">

          <span className="eyebrow">
            VISITOR PORTAL
          </span>

          <h1>
            My Bookings
          </h1>

          <p>
            View and manage your visit appointments.
          </p>

        </div>

      </header>

      <main className="my-bookings-main">

        <section className="booking-toolbar">

          <div>

            <span className="section-label">
              YOUR ACCOUNT
            </span>

            <h2>
              Visit history
            </h2>

            <p>

              {bookings.length}{" "}

              {bookings.length === 1
                ? "booking"
                : "bookings"}

            </p>

          </div>

          <div className="filter-buttons">

            {[
              ["ALL", "All"],
              ["PENDING", "Pending"],
              ["APPROVED", "Approved"],
              ["COMPLETED", "Finished"],
              ["CANCELLED", "Cancelled"]
            ].map(
              ([value, label]) => (

                <button
                  key={value}
                  type="button"
                  className={
                    filter === value
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setFilter(value)
                  }
                >
                  {label}
                </button>

              )
            )}

          </div>

        </section>

        {loading && (

          <div className="state-card">

            <div className="loading-spinner"></div>

            <h3>
              Loading bookings
            </h3>

            <p>
              Please wait...
            </p>

          </div>

        )}

        {!loading &&
          error && (

            <div className="state-card error-card">

              <div className="state-icon">
                !
              </div>

              <h3>
                Unable to load bookings
              </h3>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="retry-button"
                onClick={loadBookings}
              >
                Try Again
              </button>

            </div>

          )}

        {!loading &&
          !error &&
          filteredBookings.length === 0 && (

            <div className="state-card">

              <div className="empty-icon">
                +
              </div>

              <h3>
                No bookings found
              </h3>

              <p>

                {filter === "ALL"
                  ? "You have not booked any visits yet."
                  : `There are no ${getStatusText(
                      filter
                    ).toLowerCase()} bookings.`}

              </p>

              {filter === "ALL" && (

                <button
                  type="button"
                  className="book-button"
                  onClick={() =>
                    (window.location.href =
                      "/user/slots")
                  }
                >
                  Book a Visit
                </button>

              )}

            </div>

          )}

        {!loading &&
          !error &&
          filteredBookings.length > 0 && (

            <div className="booking-list">

              {filteredBookings.map(
                (booking) => {

                  const statusClass =
                    getStatusClass(
                      booking.status
                    );

                  const normalizedStatus =
                    String(
                      booking.status || ""
                    ).toUpperCase();

                  const isCancelled =
                    normalizedStatus ===
                      "CANCELLED" ||
                    normalizedStatus ===
                      "CANCELED";

                  const isFinished =
                    normalizedStatus ===
                    "COMPLETED";

                  const isCancelling =
                    Number(
                      cancellingId
                    ) ===
                    Number(
                      booking.id
                    );

                  const isQrVisible =
                    visibleQrIds.has(
                      booking.id
                    );

                  return (

                    <article
                      className={`booking-card ${statusClass}`}
                      key={booking.id}
                    >

                      <div className="booking-card-top">

                        <div>

                          <span className="booking-number">
                            BOOKING #{booking.id}
                          </span>

                          <h3>
                            Visit Appointment
                          </h3>

                        </div>

                        <span
                          className={`booking-status ${statusClass}`}
                        >

                          <span className="status-dot"></span>

                          {getStatusText(
                            booking.status
                          )}

                        </span>

                      </div>

                      <div className="booking-content">

                        <div className="booking-details">

                          <div className="booking-detail">

                            <span>
                              VISIT DATE
                            </span>

                            <strong>
                              {formatDate(
                                booking.visit_date
                              )}
                            </strong>

                          </div>

                          <div className="booking-detail">

                            <span>
                              TIME
                            </span>

                            <strong>
                              {booking.visit_time}
                            </strong>

                          </div>

                          <div className="booking-detail purpose">

                            <span>
                              PURPOSE
                            </span>

                            <strong>
                              {booking.purpose ||
                                "General visit"}
                            </strong>

                          </div>

                        </div>

                        <div className="qr-section">

                          <span className="qr-label">
                            SECURITY QR
                          </span>

                          {!isCancelled && (

                            <button
                              type="button"
                              className="qr-toggle-button"
                              onClick={() =>
                                toggleQr(
                                  booking.id
                                )
                              }
                            >

                              {isQrVisible
                                ? "Hide QR"
                                : "Show QR"}

                            </button>

                          )}

                          {isCancelled && (

                            <p className="qr-cancelled-note">
                              Booking cancelled
                            </p>

                          )}

                          {!isCancelled &&
                            isQrVisible && (

                              <div className="qr-box">

                                <QRCodeCanvas
                                  value={getQrValue(
                                    booking
                                  )}
                                  size={150}
                                  bgColor="#ffffff"
                                  fgColor="#111827"
                                  level="H"
                                  includeMargin={
                                    true
                                  }
                                />

                                <p>
                                  Show this QR at security
                                </p>

                              </div>

                            )}

                        </div>

                      </div>

                      <div className="booking-card-footer">

                        <div className="booking-token">

                          <span>
                            SECURITY TOKEN
                          </span>

                          <strong>

                            {booking.booking_token ||
                              "Not available"}

                          </strong>

                        </div>

                        {!isCancelled &&
                          !isFinished && (

                            <button
                              type="button"
                              className="cancel-button"
                              disabled={
                                isCancelling
                              }
                              onClick={() =>
                                handleCancel(
                                  booking.id
                                )
                              }
                            >

                              {isCancelling
                                ? "Cancelling..."
                                : "Cancel Booking"}

                            </button>

                          )}

                      </div>

                    </article>

                  );

                }
              )}

            </div>

          )}

      </main>

      <footer className="my-bookings-footer">

        <span>
          Shnool International LLC
        </span>

        <span>
          Visitor Management System
        </span>

      </footer>

    </div>

  );
}

export default MyBookings;