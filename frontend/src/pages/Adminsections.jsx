import React, { useState, useEffect, useMemo } from 'react';
import './Admindashboard.css';
import { API_BASE } from '../services/api';

/**
 * Shnool admin — section views
 *
 * FIX: every fetch() below now calls /api/admin/... instead of
 * /admin/.... Vercel's routing only forwards paths starting with
 * /api/ to the Express backend — anything else falls through to
 * the frontend's own index.html, which is why these were getting
 * back "<!doctype html>..." instead of JSON.
 *
 *   Bookings          GET  /api/admin/bookings                 PATCH /api/admin/bookings/:id  { status }
 *   Visitors (all)    GET  /api/admin/visitors
 *   Current visitors  GET  /api/admin/visitors/current          PATCH /api/admin/bookings/:id  { status: "Completed" | "Absent" }
 *   Completed history GET  /api/admin/visitors/completed
 *
 * Each list starts as `null` (loading), becomes `[]` on an empty result,
 * or an array of records. Actions update local state optimistically and
 * revert with an inline error if the request fails.
 */


const STATUS_CLASS = {
  Approved: 'status-pill--approved',
  Pending: 'status-pill--pending',
  Completed: 'status-pill--completed',
  Cancelled: 'status-pill--cancelled',
  Absent: 'status-pill--cancelled',
  Active: 'status-pill--approved',
  'On duty': 'status-pill--approved',
  'Off duty': 'status-pill--pending',
  Blocked: 'status-pill--cancelled',
};

function StatusPill({ status }) {
  return <span className={`status-pill ${STATUS_CLASS[status] || 'status-pill--pending'}`}>{status}</span>;
}

function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="empty-note" style={{ color: '#DC2626' }}>{message}</div>;
}

/* ------------------------------------------------------------------ */
/* 1. Bookings                                                         */
/* ------------------------------------------------------------------ */

export function BookingsView() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/admin/bookings`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => { if (!cancelled) setBookings(data); })
      .catch(() => { if (!cancelled) { setBookings([]); setError('Could not load bookings.'); } });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => (bookings || []).filter((b) => {
    const matchesQuery = b.visitor.toLowerCase().includes(query.toLowerCase()) || b.host.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [bookings, query, statusFilter]);

  async function setStatus(id, status) {
    const prev = bookings;
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setBookings(prev);
      setError('Could not update that booking. Try again.');
    }
  }

  return (
    <div>
      <ErrorNote message={error} />
      <div className="toolbar">
        <input className="toolbar__input" placeholder="Search by visitor or host" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="toolbar__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {['Pending', 'Approved', 'Completed', 'Cancelled', 'Absent'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="section-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ padding: '10px 14px' }}>Visitor</th>
              <th style={{ padding: '10px 14px' }}>Host</th>
              <th style={{ padding: '10px 14px' }}>Date</th>
              <th style={{ padding: '10px 14px' }}>Time</th>
              <th style={{ padding: '10px 14px' }}>Purpose</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px' }}></th>
            </tr>
          </thead>
          <tbody>
            {bookings === null ? (
              <tr><td colSpan={7} className="empty-note">Loading bookings…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="empty-note">No bookings match your search.</td></tr>
            ) : filtered.map((b) => (
              <tr key={b.id}>
                <td style={{ padding: '10px 14px' }}>{b.visitor}</td>
                <td style={{ padding: '10px 14px', color: '#6B7280' }}>{b.host}</td>
                <td style={{ padding: '10px 14px' }}>{b.date}</td>
                <td style={{ padding: '10px 14px' }}>{b.time}</td>
                <td style={{ padding: '10px 14px', color: '#6B7280' }}>{b.purpose}</td>
                <td style={{ padding: '10px 14px' }}><StatusPill status={b.status} /></td>
                <td style={{ padding: '10px 14px' }}>
                  {b.status === 'Pending' ? (
                    <div className="btn-row">
                      <button className="btn btn--primary" onClick={() => setStatus(b.id, 'Approved')}>Approve</button>
                      <button className="btn btn--danger" onClick={() => setStatus(b.id, 'Cancelled')}>Cancel</button>
                    </div>
                  ) : b.status === 'Approved' ? (
                    <button className="btn btn--text" onClick={() => setStatus(b.id, 'Cancelled')}>Cancel</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Visitors (full history)                                          */
/* ------------------------------------------------------------------ */

export function VisitorsView() {
  const [visitors, setVisitors] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/admin/visitors`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => { if (!cancelled) setVisitors(data); })
      .catch(() => { if (!cancelled) { setVisitors([]); setError('Could not load visitor history.'); } });
    return () => { cancelled = true; };
  }, []);

  const filtered = (visitors || []).filter((v) => v.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <ErrorNote message={error} />
      <div className="toolbar">
        <input className="toolbar__input" placeholder="Search visitor name" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="section-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ padding: '10px 14px' }}>Visitor</th>
              <th style={{ padding: '10px 14px' }}>Host</th>
              <th style={{ padding: '10px 14px' }}>Date</th>
              <th style={{ padding: '10px 14px' }}>Check-in</th>
              <th style={{ padding: '10px 14px' }}>Check-out</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visitors === null ? (
              <tr><td colSpan={6} className="empty-note">Loading visitor history…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="empty-note">No visitors found.</td></tr>
            ) : filtered.map((v) => (
              <tr key={v.id}>
                <td style={{ padding: '10px 14px' }}>{v.name}</td>
                <td style={{ padding: '10px 14px', color: '#6B7280' }}>{v.host}</td>
                <td style={{ padding: '10px 14px' }}>{v.date}</td>
                <td style={{ padding: '10px 14px' }}>{v.checkIn}</td>
                <td style={{ padding: '10px 14px' }}>{v.checkOut}</td>
                <td style={{ padding: '10px 14px' }}><StatusPill status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Current visitors (checked in / waiting right now)                 */
/* ------------------------------------------------------------------ */

export function CurrentVisitorsView() {
  const [visitors, setVisitors] = useState(null);
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);

  const load = () => {
    fetch(`${API_BASE}/api/admin/visitors/current`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setVisitors(data))
      .catch(() => {
        setVisitors([]);
        setError('Could not load current visitors.');
      });
  };

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, status) {
    const prev = visitors;
    setActingId(id);

    setVisitors((vs) => vs.filter((v) => v.id !== id));

    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setVisitors(prev);
      setError(`Could not mark that visitor as ${status.toLowerCase()}. Try again.`);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <ErrorNote message={error} />
      <div className="section-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ padding: '10px 14px' }}>Visitor</th>
              <th style={{ padding: '10px 14px' }}>Purpose</th>
              <th style={{ padding: '10px 14px' }}>Time</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px' }}></th>
            </tr>
          </thead>
          <tbody>
            {visitors === null ? (
              <tr><td colSpan={5} className="empty-note">Loading current visitors…</td></tr>
            ) : visitors.length === 0 ? (
              <tr><td colSpan={5} className="empty-note">No visitors are currently waiting.</td></tr>
            ) : visitors.map((v) => (
              <tr key={v.id}>
                <td style={{ padding: '10px 14px' }}>{v.name}</td>
                <td style={{ padding: '10px 14px', color: '#6B7280' }}>{v.purpose}</td>
                <td style={{ padding: '10px 14px' }}>{v.visit_time}</td>
                <td style={{ padding: '10px 14px' }}><StatusPill status={v.status} /></td>
                <td style={{ padding: '10px 14px' }}>
                  <div className="btn-row">
                    <button
                      className="btn btn--primary"
                      disabled={actingId === v.id}
                      onClick={() => updateStatus(v.id, 'Completed')}
                    >
                      Mark Completed
                    </button>
                    <button
                      className="btn btn--danger"
                      disabled={actingId === v.id}
                      onClick={() => updateStatus(v.id, 'Absent')}
                    >
                      Mark Absent
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Completed / Absent history                                        */
/* ------------------------------------------------------------------ */

export function CompletedView() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | Completed | Absent

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/admin/visitors/completed`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => { if (!cancelled) setRecords(data); })
      .catch(() => { if (!cancelled) { setRecords([]); setError('Could not load completed visits.'); } });
    return () => { cancelled = true; };
  }, []);

  const filtered = (records || []).filter((r) => {
    const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div>
      <ErrorNote message={error} />
      <div className="toolbar">
        <input
          className="toolbar__input"
          placeholder="Search by visitor name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="toolbar__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="Completed">Completed</option>
          <option value="Absent">Absent</option>
        </select>
      </div>
      <div className="section-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ padding: '10px 14px' }}>Visitor</th>
              <th style={{ padding: '10px 14px' }}>Date</th>
              <th style={{ padding: '10px 14px' }}>Time</th>
              <th style={{ padding: '10px 14px' }}>Purpose</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {records === null ? (
              <tr><td colSpan={5} className="empty-note">Loading completed visits…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="empty-note">No records found.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: '10px 14px' }}>{r.name}</td>
                <td style={{ padding: '10px 14px' }}>{r.date}</td>
                <td style={{ padding: '10px 14px' }}>{r.time}</td>
                <td style={{ padding: '10px 14px', color: '#6B7280' }}>{r.purpose}</td>
                <td style={{ padding: '10px 14px' }}><StatusPill status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
