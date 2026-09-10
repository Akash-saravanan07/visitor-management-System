import React, { useState, useEffect } from 'react';
import './Admindashboard.css';
import { BookingsView } from './Adminsections';
import VisitorsView from './Visitorsview';
import CurrentVisitorsView from './Currentvisitorsview';
import CompletedView from './Completedview';
import { API_BASE } from '../services/api';

/**
 * Shnool Admin Dashboard
 *
 * Self-contained shell: sidebar navigation + top bar + dashboard view.
 * Styling lives in AdminDashboard.css — import it alongside this file.
 *
 * Expected endpoints (on API_BASE, e.g. http://localhost:5000):
 *
 *   GET /admin/stats             -> { users, bookings, pending, completed }
 *   GET /admin/bookings/weekly   -> [{ day, value }, ...]                 (last 7 days)
 *   GET /admin/bookings/status   -> [{ label, value, color }, ...]
 *   GET /admin/visitors/today    -> [{ time, name, purpose, status }, ...]
 *
 * FALLBACK BEHAVIOR (added because these routes 404 right now):
 *   If any of the four dashboard requests above fails, DashboardView
 *   falls back to the SAMPLE_* constants below instead of showing
 *   "Could not load dashboard data." A small yellow notice banner is
 *   shown whenever sample data is being displayed, so it's obvious
 *   this is a placeholder. Once your backend routes exist and return
 *   200s, the banner disappears and real data takes over automatically
 *   — no code change needed here.
 *
 * IMPORTS CHANGED IN THIS VERSION:
 *   Visitors, Current Visitors, and Completed used to all live inside
 *   Adminsections.jsx. They are now separate files —
 *   Visitorsview.jsx, Currentvisitorsview.jsx, Completedview.jsx —
 *   each with its own sample-data fallback. Only BookingsView still
 *   comes from Adminsections.jsx.
 *
 * NOTE: login state lives in sessionStorage, not localStorage.
 * localStorage is shared across every tab of the same origin, so
 * logging in as a different role in a second tab was overwriting
 * the first tab's session and bouncing it to the wrong dashboard
 * mid-use. sessionStorage is scoped per-tab, so each tab now keeps
 * its own independent login.
 */

// Backend base URL. The frontend runs on the Vite dev server (e.g. :5173),
// while the backend runs separately (e.g. :5000) — so every fetch below
// must use a full URL, not a relative one, or it will hit the Vite server
// instead of the API and fail.

// --- Sample fallback data for the dashboard, used only when the real
// endpoints above fail (e.g. 404 because the backend route doesn't
// exist yet). Edit these freely — they're just placeholders. ---
const SAMPLE_STATS = { users: 11, bookings: 13, pending: 3, completed: 0 };

const SAMPLE_WEEKLY = [
  { day: 'Wed', value: 1 },
  { day: 'Thu', value: 1 },
  { day: 'Fri', value: 0 },
  { day: 'Sat', value: 5 },
  { day: 'Sun', value: 1 },
  { day: 'Mon', value: 8 },
  { day: 'Tue', value: 0 },
];

const SAMPLE_STATUS_BREAKDOWN = [
  { label: 'Cancelled', value: 3, color: '#e5484d' },
  { label: 'Approved', value: 7, color: '#1f5fd8' },
  { label: 'Pending', value: 3, color: '#f5a623' },
];

const SAMPLE_UPCOMING = [
  { time: '10:00 AM', name: 'Deepa Nair', purpose: 'Interview - Frontend role', status: 'Approved' },
  { time: '11:30 AM', name: 'Rahul Menon', purpose: 'Vendor meeting', status: 'Pending' },
  { time: '02:00 PM', name: 'Sanjay Gupta', purpose: 'Admission enquiry', status: 'Approved' },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar' },
  { id: 'visitors', label: 'Visitors', icon: 'id' },
  { id: 'currentVisitors', label: 'Current Visitors', icon: 'clock' },
  { id: 'completed', label: 'Completed', icon: 'chart' },
];

const ICONS = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  calendar: 'M4 6h16M7 3v4M17 3v4M5 8h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1z',
  users: 'M7 8a3 3 0 106 0 3 3 0 00-6 0zM3 19c0-3 3-5 7-5s7 2 7 5M16 8a3 3 0 013 3M18 12c2.5 0 4 1.6 4 4',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
  id: 'M4 6h16v12H4zM9 12a2 2 0 104 0 2 2 0 00-4 0zM7 17c0-1.5 1.5-2.5 5-2.5s5 1 5 2.5M15 9h3M15 12h3',
  clock: 'M12 7v5l3 3M12 21a9 9 0 100-18 9 9 0 000 18z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-.9a7 7 0 002 1.2L10 21h4l.5-2.5a7 7 0 002-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  bell: 'M12 3a5 5 0 00-5 5v3.4c0 .6-.2 1.2-.6 1.7L5 15h14l-1.4-1.9c-.4-.5-.6-1.1-.6-1.7V8a5 5 0 00-5-5zM9.5 18a2.5 2.5 0 005 0',
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

const STATUS_CLASS = {
  Approved: 'status-pill--approved',
  Pending: 'status-pill--pending',
  Completed: 'status-pill--completed',
  Cancelled: 'status-pill--cancelled',
  Absent: 'status-pill--cancelled', // reuses the red "cancelled" look — add a
                                     // dedicated .status-pill--absent rule in
                                     // AdminDashboard.css if you want a
                                     // different color for no-shows.
};

function StatusPill({ status }) {
  return <span className={`status-pill ${STATUS_CLASS[status] || 'status-pill--pending'}`}>{status}</span>;
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
    </div>
  );
}

function BookingOverviewChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty-note">No booking data yet.</div>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div key={d.day} className="bar-chart__col">
          <div
            title={`${d.value} bookings`}
            className="bar-chart__bar"
            style={{ height: `${(d.value / max) * 120}px` }}
          />
          <span className="bar-chart__label">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function BookingStatusPanel({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty-note">No bookings yet.</div>;
  }
  const total = data.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div>
      <div className="status-strip">
        {data.map((s) => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="status-list">
        {data.map((s) => (
          <div key={s.label} className="status-list__row">
            <span className="status-list__label">
              <span className="status-list__dot" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="status-list__value">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="panel">
      <h3 className="panel__title">{title}</h3>
      {children}
    </div>
  );
}

function DashboardView() {
  const [stats, setStats] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [usingSampleData, setUsingSampleData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, weeklyRes, statusRes, upcomingRes] = await Promise.all([
  fetch(`${API_BASE}/api/admin/stats`),
  fetch(`${API_BASE}/api/admin/bookings/weekly`),
  fetch(`${API_BASE}/api/admin/bookings/status`),
  fetch(`${API_BASE}/api/admin/visitors/today`),
]);
        if (!statsRes.ok || !weeklyRes.ok || !statusRes.ok || !upcomingRes.ok) {
          throw new Error('One or more dashboard requests failed');
        }
        const [statsData, weeklyData, statusData, upcomingData] = await Promise.all([
          statsRes.json(),
          weeklyRes.json(),
          statusRes.json(),
          upcomingRes.json(),
        ]);
        if (!cancelled) {
          setStats(statsData);
          setWeekly(weeklyData);
          setStatusBreakdown(statusData);
          setUpcoming(upcomingData);
          setUsingSampleData(false);
        }
      } catch (e) {
        console.error('Dashboard load error (falling back to sample data):', e);
        if (!cancelled) {
          setStats(SAMPLE_STATS);
          setWeekly(SAMPLE_WEEKLY);
          setStatusBreakdown(SAMPLE_STATUS_BREAKDOWN);
          setUpcoming(SAMPLE_UPCOMING);
          setUsingSampleData(true);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {usingSampleData && (
        <div className="dashboard-notice">
          Showing sample data — connect <code>/admin/stats</code>, <code>/admin/bookings/weekly</code>,{' '}
          <code>/admin/bookings/status</code>, and <code>/admin/visitors/today</code> on your backend
          to show real numbers here.
        </div>
      )}

      <div className="stat-grid">
        {stats ? (
          <>
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Bookings" value={stats.bookings} />
            <StatCard label="Pending" value={stats.pending} />
            <StatCard label="Completed" value={stats.completed} />
          </>
        ) : (
          <div className="empty-note">Loading stats…</div>
        )}
      </div>

      <div className="panel-row">
        <div className="panel-row__chart">
          <Panel title="Booking overview — last 7 days">
            <BookingOverviewChart data={weekly} />
          </Panel>
        </div>
        <div className="panel-row__status">
          <Panel title="Booking status">
            <BookingStatusPanel data={statusBreakdown} />
          </Panel>
        </div>
      </div>

      <div className="visitors-panel">
        <h3 className="visitors-panel__title">Today's upcoming visitors</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Name</th>
              <th>Purpose</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!upcoming ? (
              <tr><td colSpan={4} className="empty-note">Loading visitors…</td></tr>
            ) : upcoming.length === 0 ? (
              <tr><td colSpan={4} className="empty-note">No visitors scheduled for today.</td></tr>
            ) : upcoming.map((v, i) => (
              <tr key={i}>
                <td>{v.time}</td>
                <td>{v.name}</td>
                <td className="td--muted">{v.purpose}</td>
                <td><StatusPill status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const SECTION_VIEWS = {
  bookings: BookingsView,
  visitors: VisitorsView,
  currentVisitors: CurrentVisitorsView,
  completed: CompletedView,
};

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function AdminDashboard({ onLogout }) {
  const [active, setActive] = useState('dashboard');
  const activeLabel = NAV_ITEMS.find((n) => n.id === active)?.label || 'Dashboard';
  const SectionView = SECTION_VIEWS[active];
  const user = getStoredUser();
  const displayName = user?.full_name || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();

  function handleLogout() {
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">Shnool admin</div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`admin-nav__item ${isActive ? 'admin-nav__item--active' : ''}`}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="admin-sidebar__logout" onClick={handleLogout}>Log out</button>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-header">
          <span className="admin-header__product">Shnool visitor management</span>
          <div className="admin-header__right">
            <span className="admin-header__bell"><Icon name="bell" /></span>
            <div className="admin-header__profile">
              <div className="admin-avatar">{initial}</div>
              <span className="admin-header__name">{displayName}</span>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <div className="admin-content__title-row">
            <h1 className="admin-content__title">{activeLabel}</h1>
            {active === 'dashboard' && <p className="admin-content__subtitle">Welcome back, {displayName}</p>}
          </div>
          {active === 'dashboard' ? <DashboardView /> : SectionView ? <SectionView /> : null}
        </main>
      </div>
    </div>
  );
}
