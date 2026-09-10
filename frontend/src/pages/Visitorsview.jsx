import React, { useEffect, useMemo, useState } from 'react';
import './Visitorsview.css';
import { API_BASE } from '../services/api';

/**
 * Visitors — master list of everyone who has ever booked a visit.
 *
 * Tries GET /admin/visitors first. If that request fails (404, network
 * error, etc.) this falls back to SAMPLE_VISITORS below instead of
 * showing a "could not load" message — remove the fallback once your
 * backend route is ready by deleting the `catch` block's fallback
 * assignment and re-throwing/setting the error instead.
 *
 * Expected real response shape once the backend route exists:
 *   [{ id, name, email, phone, totalBookings, lastVisit }, ...]
 */


const SAMPLE_VISITORS = [
  { id: 'sample-1', name: 'Akash Saravanan', email: 'akash@example.com', phone: '98765 43210', totalBookings: 4, lastVisit: '2026-09-05' },
  { id: 'sample-2', name: 'Priya Ramesh', email: 'priya.r@example.com', phone: '91234 56780', totalBookings: 1, lastVisit: '2026-08-28' },
  { id: 'sample-3', name: 'Karthik Balan', email: 'karthik.b@example.com', phone: '99887 76655', totalBookings: 2, lastVisit: null },
];

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function VisitorsView() {
  const [visitors, setVisitors] = useState(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/admin/visitors`);
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        if (!cancelled) {
          setVisitors(Array.isArray(data) ? data : []);
          setUsingSampleData(false);
        }
      } catch (e) {
        console.error('Load visitors error (falling back to sample data):', e);
        if (!cancelled) {
          setVisitors(SAMPLE_VISITORS);
          setUsingSampleData(true);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!visitors) return [];
    const q = search.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter((v) =>
      [v.name, v.email, v.phone].some((field) =>
        String(field || '').toLowerCase().includes(q)
      )
    );
  }, [visitors, search]);

  return (
    <div className="visitors-view">
      {usingSampleData && (
        <div className="visitors-view__notice">
          Showing sample data — connect <code>GET /admin/visitors</code> on your backend to show real visitors here.
        </div>
      )}

      <div className="visitors-view__toolbar">
        <input
          type="text"
          className="visitors-view__search"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {visitors && (
          <span className="visitors-view__count">
            {filtered.length} of {visitors.length} visitor{visitors.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="visitors-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Total bookings</th>
              <th>Last visit</th>
            </tr>
          </thead>
          <tbody>
            {visitors === null ? (
              <tr><td colSpan={5} className="empty-note">Loading visitors…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-note">
                  {visitors.length === 0 ? 'No visitors yet.' : 'No visitors match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td className="td--muted">{v.email || '—'}</td>
                  <td className="td--muted">{v.phone || '—'}</td>
                  <td>{v.totalBookings ?? 0}</td>
                  <td className="td--muted">{formatDate(v.lastVisit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
