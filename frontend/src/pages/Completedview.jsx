import React, { useEffect, useMemo, useState } from 'react';
import './CompletedView.css';
import { API_BASE } from '../services/api';

/**
 * Completed — history of finished visits (Completed or Absent), with a
 * filter to switch between All / Completed / Absent.
 *
 * Expected backend endpoint:
 *   GET /admin/visitors/completed
 *     -> [{ id, name, purpose, date, time, status }, ...]
 *     status is expected to be "Completed" or "Absent".
 *
 * This file is self-contained — it does not import anything from
 * Adminsections.jsx and does not touch AdminDashboard.jsx beyond the
 * single import line that points to it.
 */


const FILTERS = ['All', 'Completed', 'Absent'];

const STATUS_CLASS = {
  Completed: 'status-pill--completed',
  Absent: 'status-pill--cancelled',
};

function StatusPill({ status }) {
  return <span className={`status-pill ${STATUS_CLASS[status] || 'status-pill--pending'}`}>{status}</span>;
}

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

export default function CompletedView() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const res = await fetch(`${API_BASE}/admin/visitors/completed`);
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Load completed visitors error:', e);
        if (!cancelled) {
          setRecords([]);
          setError('Could not load completed visits.');
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!records) return [];
    if (filter === 'All') return records;
    return records.filter((r) => r.status === filter);
  }, [records, filter]);

  return (
    <div className="completed-view">
      <div className="completed-view__toolbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`completed-view__filter ${filter === f ? 'completed-view__filter--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="visitors-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Name</th>
              <th>Purpose</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={5} className="empty-note">{error}</td></tr>
            ) : records === null ? (
              <tr><td colSpan={5} className="empty-note">Loading history…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-note">
                  {records.length === 0 ? 'No completed visits yet.' : `No ${filter.toLowerCase()} visits.`}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.time}</td>
                  <td>{r.name}</td>
                  <td className="td--muted">{r.purpose}</td>
                  <td><StatusPill status={r.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}