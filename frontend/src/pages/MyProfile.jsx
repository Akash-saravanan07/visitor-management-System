import React from "react";
import "./MyProfile.css";

// FIX: sessionStorage instead of localStorage — see note in Login.jsx.

function MyProfile() {

  const storedUser = sessionStorage.getItem("user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : null;

  const handleBack = () => {
    window.location.href = "/user";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    window.location.href = "/login";
  };

  const userName = user?.full_name || "User";
  const userEmail = user?.email || "Not available";
  const userPhone = user?.phone || "Not available";
  const userRole = user?.role || "USER";


  return (
    <div className="profile-page">

      <header className="profile-header">

        <div className="profile-brand">

          <div className="profile-brand-mark">
            S
          </div>

          <div>

            <div className="profile-brand-name">
              Shnoor International LLC
            </div>

            <div className="profile-brand-subtitle">
              Visitor Management
            </div>

          </div>

        </div>

        <button
          className="profile-back-button"
          onClick={handleBack}
        >
          ← Back
        </button>

      </header>

      <main className="profile-main">

        <section className="profile-intro">

          <span className="profile-label">
            ACCOUNT
          </span>

          <h1>
            My Profile
          </h1>

          <p>
            View your personal information and account details.
          </p>

        </section>

        <section className="profile-card">

          <div className="profile-card-header">

            <div className="profile-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>

            <div>

              <h2>
                {userName}
              </h2>

              <p>
                {userRole}
              </p>

            </div>

          </div>

          <div className="profile-status">

            <span className="status-dot"></span>

            <span>
              Account Active
            </span>

          </div>

          <div className="profile-details">

            <div className="profile-detail-row">

              <div className="profile-detail-label">
                Full name
              </div>

              <div className="profile-detail-value">
                {userName}
              </div>

            </div>

            <div className="profile-detail-row">

              <div className="profile-detail-label">
                Email address
              </div>

              <div className="profile-detail-value">
                {userEmail}
              </div>

            </div>

            <div className="profile-detail-row">

              <div className="profile-detail-label">
                Phone number
              </div>

              <div className="profile-detail-value">
                {userPhone}
              </div>

            </div>

            <div className="profile-detail-row">

              <div className="profile-detail-label">
                Account type
              </div>

              <div className="profile-detail-value">
                {userRole}
              </div>

            </div>

          </div>

        </section>

        <section className="account-info">

          <div className="account-info-heading">

            <span>
              ACCOUNT INFORMATION
            </span>

            <h2>
              Your account
            </h2>

          </div>

          <div className="account-info-list">

            <div className="account-info-item">

              <span>
                Access
              </span>

              <strong>
                Visitor
              </strong>

            </div>

            <div className="account-info-item">

              <span>
                Status
              </span>

              <strong className="active-text">
                Active
              </strong>

            </div>

            <div className="account-info-item">

              <span>
                Portal
              </span>

              <strong>
                Visitor Management
              </strong>

            </div>

          </div>

        </section>

        <section className="profile-actions">

          <button
            className="dashboard-button"
            onClick={handleBack}
          >
            ← Dashboard
          </button>

          <button
            className="profile-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </section>

      </main>

      <footer className="profile-footer">

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

export default MyProfile;