import React, { useState } from "react";
import "./user.css";

// FIX: sessionStorage instead of localStorage — see note in Login.jsx.

function User() {
  const [menuOpen, setMenuOpen] = useState(false);

  const storedUser = sessionStorage.getItem("user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : null;

  const userName = user?.full_name || "User";

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleMenuClick = (page) => {
    setMenuOpen(false);

    if (page === "book") {
      window.location.href = "/user/book";
      return;
    }

    if (page === "slots") {
      window.location.href = "/user/slots";
      return;
    }

    if (page === "bookings") {
      window.location.href = "/user/bookings";
      return;
    }

    if (page === "profile") {
      window.location.href = "/user/profile";
      return;
    }
  };

  const handleBookVisit = () => {
    window.location.href = "/user/book";
  };

  const handleAvailableSlots = () => {
    window.location.href = "/user/slots";
  };

  return (
    <div className="user-page">

      <header className="user-header">

        <div className="brand">

          <div className="brand-mark">
            S
          </div>

          <div className="brand-name">
            Shnoor International LLC
          </div>

        </div>

        <button
          className={`menu-button ${
            menuOpen ? "active" : ""
          }`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Open menu"
        >

          <span></span>
          <span></span>
          <span></span>

        </button>

      </header>

      {menuOpen && (
        <div
          className="menu-overlay"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      <aside
        className={`side-menu ${
          menuOpen ? "open" : ""
        }`}
      >

        <div className="menu-top">

          <div>

            <span className="menu-small-title">
              MENU
            </span>

            <h2>
              Visitor Management
            </h2>

          </div>

          <button
            className="close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>

        </div>

        <nav className="menu-list">

          <button
            type="button"
            onClick={() => handleMenuClick("slots")}
          >

            <span className="menu-icon">
              ◷
            </span>

            <span>
              Available Slots
            </span>

          </button>

          <button
            type="button"
            onClick={() => handleMenuClick("bookings")}
          >

            <span className="menu-icon">
              □
            </span>

            <span>
              My Bookings
            </span>

          </button>

          <button
            type="button"
            onClick={() => handleMenuClick("profile")}
          >

            <span className="menu-icon">
              ○
            </span>

            <span>
              My Profile
            </span>

          </button>

        </nav>

        <div className="menu-bottom">

          <button
            className="menu-logout"
            type="button"
            onClick={handleLogout}
          >

            <span className="menu-icon">
              ↪
            </span>

            <span>
              Logout
            </span>

          </button>

        </div>

      </aside>

      <main className="user-main">

        <section className="welcome">

          <span className="welcome-label">
            VISITOR PORTAL
          </span>

          <h1>
            Welcome, {userName}
          </h1>

          <p>
            Manage your visits and account from one place.
          </p>

        </section>

        <section className="profile-section">

          <div className="section-heading">

            <div>

              <span>
                ACCOUNT
              </span>

              <h2>
                Personal details
              </h2>

            </div>

            <div className="account-status">

              <span></span>

              Active

            </div>

          </div>

          <div className="details-list">

            <div className="detail-row">

              <div className="detail-label">
                Full name
              </div>

              <div className="detail-value">
                {user?.full_name || "Not available"}
              </div>

            </div>

            <div className="detail-row">

              <div className="detail-label">
                Email
              </div>

              <div className="detail-value">
                {user?.email || "Not available"}
              </div>

            </div>

            <div className="detail-row">

              <div className="detail-label">
                Phone
              </div>

              <div className="detail-value">
                {user?.phone || "Not available"}
              </div>

            </div>

            <div className="detail-row">

              <div className="detail-label">
                Account type
              </div>

              <div className="detail-value">
                {user?.role || "USER"}
              </div>

            </div>

          </div>

        </section>

        <section className="quick-section">

          <button
            type="button"
            className="quick-item"
            onClick={handleBookVisit}
          >

            <span className="quick-number">
              01
            </span>

            <div>

              <h3>
                Book a visit
              </h3>

              <p>
                Choose a date and available time.
              </p>

            </div>

          </button>

          <button
            type="button"
            className="quick-item"
            onClick={handleAvailableSlots}
          >

            <span className="quick-number">
              02
            </span>

            <div>

              <h3>
                Check availability
              </h3>

              <p>
                View available dates and slots.
              </p>

            </div>

          </button>

        </section>

      </main>

      <footer className="user-footer">

        <span>
          Shnoor International LLC
        </span>

        <span>
          Visitor Management System
        </span>

      </footer>

    </div>
  );
}

export default User;