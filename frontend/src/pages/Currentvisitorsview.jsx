import React, { useEffect, useState } from 'react';
import './CurrentVisitorsView.css';
import { API_BASE } from '../services/api';

/**
 * Current Visitors — people who are checked in / waiting right now.
 * Admin can mark each one Completed or Absent.
 *
 * Expected backend endpoints:
 *   GET /admin/visitors/current
 *     -> [{ id, name, purpose, checkInTime, status }, ...]
 *     `id` here must be the booking id, since it's sent straight to the
 *     PATCH call below.
 *
 *   PATCH /admin/bookings/:id
 *     body: { status: "Completed" | "Absent" }
 *     -> updated booking record (response body isn't required, this file
 *        just re-fetches the list after a successful PATCH)
 *
 * This file is self-contained — it does not import anything from
 * Adminsections.jsx and does not touch AdminDashboard.jsx beyond the
 * single import line that points to it.
 */


const STATUS_CLASS = {
  Approved: 'status-pill--approved',
  Pending: 'status-pill--pending',
  Completed: 'status-pill--completed',
  Cancelled: 'status-pill--cancelled',
  Absent: 'status-pill--cancelled',
};

function StatusPill({ status }) {
  return <span className={`status-pill ${STATUS_CLASS[status] || 'status-pill--pending'}`}>{status}</span>;
}

export default function CurrentVisitorsView() {
  const [visitors, setVisitors] = useState(null);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState('');

  async function loadVisitors() {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/admin/visitors/current`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setVisitors(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Load current visitors error:', e);
      setVisitors([]);
      setError('Could not load current visitors.');
    }
  }

  useEffect(() => {
    loadVisitors();
  }, []);

  async function handleAction(bookingId, newStatus) {
    setActionError('');
    setActioningId(bookingId);

    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Update failed');

      // Refresh the list so completed/absent visitors drop off immediately.
      await loadVisitors();
    } catch (e) {
      console.error('Update visitor status error:', e);
      setActionError(`Could not mark this visitor as ${newStatus}. Please try again.`);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="current-visitors-view">
      {actionError && <div className="current-visitors-view__error">{actionError}</div>}

      <div className="visitors-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Check-in time</th>
              <th>Name</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={5} className="empty-note">{error}</td></tr>
            ) : visitors === null ? (
              <tr><td colSpan={5} className="empty-note">Loading current visitors…</td></tr>
            ) : visitors.length === 0 ? (
              <tr><td colSpan={5} className="empty-note">No one is currently checked in.</td></tr>
            ) : (
              visitors.map((v) => {
                const isBusy = actioningId === v.id;
                return (
                  <tr key={v.id}>
                    <td>{v.checkInTime}</td>
                    <td>{v.name}</td>
                    <td className="td--muted">{v.purpose}</td>
                    <td><StatusPill status={v.status} /></td>
                    <td>
                      <div className="current-visitors-view__actions">
                        <button
                          type="button"
                          className="cv-btn cv-btn--complete"
                          disabled={isBusy}
                          onClick={() => handleAction(v.id, 'Completed')}
                        >
                          {isBusy ? '…' : 'Mark Completed'}
                        </button>
                        <button
                          type="button"
                          className="cv-btn cv-btn--absent"
                          disabled={isBusy}
                          onClick={() => handleAction(v.id, 'Absent')}
                        >
                          {isBusy ? '…' : 'Mark Absent'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}