import React, { useEffect, useRef, useState } from "react";
import "./securityDashboard.css";
import { API_BASE } from "../services/api";


// FIX: sessionStorage instead of localStorage — each tab now keeps its
// own independent login instead of sharing/overwriting one across tabs.

function SecurityDashboard() {

    const [view, setView] = useState("scan");

    const [manualToken, setManualToken] = useState("");
    const [booking, setBooking] = useState(null);
    const [lookupError, setLookupError] = useState("");
    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);

    const todayIso = new Date().toISOString().slice(0, 10);

    const [historyDate, setHistoryDate] = useState(todayIso);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [historyLoaded, setHistoryLoaded] = useState(false);

    const scannerRef = useRef(null);
    const scannerContainerId = "security-qr-reader";

    const storedUser = sessionStorage.getItem("user");

    let user = null;

    try {
        user = storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Invalid stored user:", error);
    }

    const handleLogout = () => {
        sessionStorage.removeItem("user");
        window.location.href = "/login";
    };

    const lookupToken = async (token) => {

        const cleanToken = String(token || "").trim();

        if (!cleanToken) {
            setLookupError("Enter or scan a booking QR token.");
            return;
        }

        try {
            setLoading(true);
            setLookupError("");
            setBooking(null);

            const response = await fetch(
                `${API_BASE}/api/bookings/token/${encodeURIComponent(cleanToken)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Booking not found for this QR code."
                );
            }

            setBooking(data.booking);

        } catch (error) {
            console.error("Token lookup error:", error);
            setLookupError(
                error.message || "Unable to verify this booking."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleScanSuccess = (decodedText) => {

        let token = decodedText;

        try {
            const parsed = JSON.parse(decodedText);

            if (parsed && parsed.booking_token) {
                token = parsed.booking_token;
            }
        } catch (error) {
            // Not JSON — assume the raw scanned text is the token itself.
        }

        setManualToken(token);
        lookupToken(token);
    };

    const handleManualSubmit = (event) => {
        event.preventDefault();
        lookupToken(manualToken);
    };

    const loadHistory = async (date) => {

        const cleanDate = String(date || "").trim();

        if (!cleanDate) {
            return;
        }

        try {
            setHistoryLoading(true);
            setHistoryError("");

            const response = await fetch(
                `${API_BASE}/api/bookings/history/${encodeURIComponent(cleanDate)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load check-in history."
                );
            }

            setHistory(data.history || []);
            setHistoryLoaded(true);

        } catch (error) {
            console.error("Load history error:", error);
            setHistoryError(
                error.message || "Unable to load check-in history."
            );
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (view === "history") {
            loadHistory(historyDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, historyDate]);

    const handleApprove = async () => {

        if (!booking) {
            return;
        }

        try {
            setApproving(true);

            const response = await fetch(
                `${API_BASE}/api/bookings/${booking.id}/approve`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        security_user_id: user?.id || user?.user_id || null
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to approve this booking."
                );
            }

            setBooking(data.booking);

            if (historyLoaded && historyDate === todayIso) {
                loadHistory(historyDate);
            }

        } catch (error) {
            console.error("Approve booking error:", error);
            alert(error.message || "Unable to approve this booking.");
        } finally {
            setApproving(false);
        }
    };

    const handleClear = () => {
        setBooking(null);
        setLookupError("");
        setManualToken("");
    };

    const startScanner = async () => {

        if (scannerRef.current) {
            return;
        }

        try {
            const { Html5Qrcode } = await import("html5-qrcode");

            const scanner = new Html5Qrcode(scannerContainerId);

            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                () => {
                    // ignore per-frame scan failures, they're expected
                }
            );

            setScannerActive(true);

        } catch (error) {
            console.error("Camera scanner error:", error);
            setLookupError(
                "Could not start the camera. You can still verify a visitor using the manual token field below."
            );
        }
    };

    const stopScanner = async () => {

        if (!scannerRef.current) {
            return;
        }

        try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
        } catch (error) {
            console.error("Error stopping scanner:", error);
        } finally {
            scannerRef.current = null;
            setScannerActive(false);
        }
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current.clear().catch(() => {});
            }
        };
    }, []);

    const normalizedStatus = String(booking?.status || "").toUpperCase();

    const isCancelled =
        normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";

    const isApproved = normalizedStatus === "APPROVED";

    const isCompleted = normalizedStatus === "COMPLETED";

    const isPending = !isCancelled && !isApproved && !isCompleted;

    const statusPillClass = isCancelled
        ? "cancelled"
        : isApproved
        ? "approved"
        : isCompleted
        ? "completed"
        : "pending";

    const formatVerifiedAt = (isoString) => {

        if (!isoString) {
            return "N/A";
        }

        try {
            return new Date(isoString).toLocaleString();
        } catch (error) {
            return isoString;
        }
    };

    const formatVisitDate = (dateString) => {

        if (!dateString) {
            return "N/A";
        }

        try {
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    };

    const styles = {

        tabBar: {
            display: "flex",
            gap: "8px",
            marginBottom: "24px"
        },

        tabButton: (active) => ({
            padding: "10px 20px",
            borderRadius: "10px",
            border: active ? "none" : "1px solid #d0d5dd",
            background: active ? "#1d2939" : "#ffffff",
            color: active ? "#ffffff" : "#344054",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer"
        }),

        historyHeaderRow: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "18px",
            flexWrap: "wrap",
            gap: "12px"
        },

        dateInput: {
            padding: "8px 12px",
            border: "1px solid #d0d5dd",
            borderRadius: "8px",
            fontSize: "14px"
        },

        emptyState: {
            padding: "28px 16px",
            textAlign: "center",
            color: "#667085",
            fontSize: "14px"
        },

        list: {
            display: "flex",
            flexDirection: "column",
            gap: "12px"
        },

        row: {
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            padding: "16px 18px",
            border: "1px solid #eaecf0",
            borderRadius: "12px",
            background: "#f9fafb"
        },

        rowName: {
            fontWeight: 700,
            fontSize: "15px",
            color: "#101828",
            marginBottom: "4px"
        },

        rowMeta: {
            fontSize: "13px",
            color: "#667085"
        },

        rowSide: {
            textAlign: "right",
            fontSize: "13px",
            color: "#344054",
            whiteSpace: "nowrap"
        },

        rowVerified: {
            fontWeight: 600,
            marginBottom: "2px"
        },

        rowBy: {
            color: "#667085"
        }

    };

    return (

        <div className="security-page">

            <header className="security-header">

                <div className="security-header-title">
                    <span className="security-eyebrow">
                        VISITOR PORTAL
                    </span>
                    <h1>
                        Security Check-In
                    </h1>
                </div>

                <div className="security-header-user">
                    <span className="security-header-name">
                        {user?.full_name || user?.name || "Security"}
                    </span>

                    <button
                        className="security-logout-button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>

            </header>

            <main className="security-main">

                <div style={styles.tabBar}>

                    <button
                        type="button"
                        style={styles.tabButton(view === "scan")}
                        onClick={() => setView("scan")}
                    >
                        Scan &amp; Verify
                    </button>

                    <button
                        type="button"
                        style={styles.tabButton(view === "history")}
                        onClick={() => setView("history")}
                    >
                        History
                    </button>

                </div>

                {view === "scan" && (

                    <>

                        <section className="security-card">

                            <h2>
                                Scan Visitor QR Code
                            </h2>

                            <div
                                id={scannerContainerId}
                                className={`qr-reader-box ${scannerActive ? "active" : ""}`}
                            ></div>

                            <div className="scanner-buttons">

                                {!scannerActive && (
                                    <button
                                        type="button"
                                        className="scanner-start-button"
                                        onClick={startScanner}
                                    >
                                        Start Camera
                                    </button>
                                )}

                                {scannerActive && (
                                    <button
                                        type="button"
                                        className="scanner-stop-button"
                                        onClick={stopScanner}
                                    >
                                        Stop Camera
                                    </button>
                                )}

                            </div>

                            <form
                                className="manual-token-form"
                                onSubmit={handleManualSubmit}
                            >

                                <input
                                    type="text"
                                    className="manual-token-input"
                                    placeholder="Or paste / type the booking token"
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                />

                                <button
                                    type="submit"
                                    className="manual-token-submit"
                                    disabled={loading}
                                >
                                    {loading ? "Checking..." : "Verify"}
                                </button>

                            </form>

                            {lookupError && (
                                <div className="lookup-error">
                                    {lookupError}
                                </div>
                            )}

                        </section>

                        {booking && (

                            <section className="security-card">

                                <div className="booking-result-header">
                                    <h2>
                                        Booking #{booking.id}
                                    </h2>

                                    <span
                                        className={`booking-status-pill ${statusPillClass}`}
                                    >
                                        {booking.status}
                                    </span>
                                </div>

                                <div className="booking-result-details">

                                    <div>
                                        <strong>Visitor:</strong>{" "}
                                        {booking.full_name || booking.name || "N/A"}
                                    </div>

                                    <div>
                                        <strong>Email:</strong> {booking.email || "N/A"}
                                    </div>

                                    <div>
                                        <strong>Phone:</strong> {booking.phone || "N/A"}
                                    </div>

                                    <div>
                                        <strong>Date:</strong> {booking.visit_date}
                                    </div>

                                    <div>
                                        <strong>Time:</strong> {booking.visit_time}
                                    </div>

                                    <div>
                                        <strong>Purpose:</strong>{" "}
                                        {booking.purpose || "General visit"}
                                    </div>

                                </div>

                                <div className="booking-result-actions">

                                    {isPending && (
                                        <button
                                            type="button"
                                            className="approve-entry-button"
                                            onClick={handleApprove}
                                            disabled={approving}
                                        >
                                            {approving ? "Approving..." : "Approve Entry"}
                                        </button>
                                    )}

                                    {isCancelled && (
                                        <div className="status-banner denied">
                                            This booking was cancelled — do not admit.
                                        </div>
                                    )}

                                    {(isApproved || isCompleted) && (
                                        <div className="status-banner verified">
                                            Already verified.
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="clear-button"
                                        onClick={handleClear}
                                    >
                                        Clear
                                    </button>

                                </div>

                            </section>

                        )}

                    </>

                )}

                {view === "history" && (

                    <section className="security-card">

                        <div style={styles.historyHeaderRow}>

                            <h2 style={{ margin: 0 }}>
                                Check-In History
                            </h2>

                            <input
                                type="date"
                                style={styles.dateInput}
                                value={historyDate}
                                onChange={(e) => setHistoryDate(e.target.value)}
                            />

                        </div>

                        {historyLoading && (
                            <div style={styles.emptyState}>
                                Loading history...
                            </div>
                        )}

                        {!historyLoading && historyError && (
                            <div className="lookup-error">
                                {historyError}
                            </div>
                        )}

                        {!historyLoading && !historyError && history.length === 0 && (
                            <div style={styles.emptyState}>
                                No visitors were checked in on this date.
                            </div>
                        )}

                        {!historyLoading && !historyError && history.length > 0 && (

                            <div style={styles.list}>

                                {history.map((entry) => (

                                    <div
                                        key={entry.id}
                                        style={styles.row}
                                    >

                                        <div>

                                            <div style={styles.rowName}>
                                                {entry.visitor_name || "N/A"}
                                            </div>

                                            <div style={styles.rowMeta}>
                                                {formatVisitDate(entry.visit_date)} &middot;{" "}
                                                {entry.visit_time} &middot;{" "}
                                                {entry.purpose || "General visit"}
                                            </div>

                                        </div>

                                        <div style={styles.rowSide}>

                                            <div style={styles.rowVerified}>
                                                Verified: {formatVerifiedAt(entry.verified_at)}
                                            </div>

                                            <div style={styles.rowBy}>
                                                By: {entry.verified_by_name || "N/A"}
                                            </div>

                                        </div>

                                    </div>

                                ))}

                            </div>

                        )}

                    </section>

                )}

            </main>

        </div>

    );
}

export default SecurityDashboard;