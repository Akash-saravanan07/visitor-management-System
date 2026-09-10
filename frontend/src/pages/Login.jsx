import React, { useState } from "react";
import "./login.css";
import { API_BASE } from "../services/api";

const API_URL = `${API_BASE}/api/auth`;

const ROLE_TABS = [
    { value: "USER", label: "User" },
    { value: "SECURITY", label: "Security" },
    { value: "ADMIN", label: "Admin" }
];

function Login() {
    const [view, setView] = useState("login"); // "login" | "forgot"
    const [selectedRole, setSelectedRole] = useState("USER");

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [forgotEmail, setForgotEmail] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        setError("");
        setSuccess("");
    };

    const handleRoleTabClick = (role) => {
        setSelectedRole(role);
        setError("");
        setSuccess("");
    };

    const redirectByRole = (role) => {
        const normalizedRole = String(role || "").trim().toUpperCase();

        if (normalizedRole === "USER") {
            window.location.href = "/user";
            return;
        }

        if (normalizedRole === "SECURITY") {
            window.location.href = "/security";
            return;
        }

        if (normalizedRole === "ADMIN") {
            window.location.href = "/admin";
            return;
        }

        setError("Invalid account role.");
    };

    const roleLabel = (role) => {
        const found = ROLE_TABS.find((tab) => tab.value === role);
        return found ? found.label : role;
    };

    const switchToForgot = () => {
        setView("forgot");
        setError("");
        setSuccess("");
        setForgotEmail(formData.email); // carry over what they already typed
    };

    const switchToLogin = () => {
        setView("login");
        setError("");
        setSuccess("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!formData.email.trim()) {
            setError("Please enter your email.");
            return;
        }

        if (!formData.password) {
            setError("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    password: formData.password
                })
            });

            const contentType = response.headers.get("content-type") || "";

            let data;

            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();

                throw new Error(
                    text
                        ? `Server returned invalid response. Status: ${response.status}`
                        : `Server returned status ${response.status}`
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Login failed. Status: ${response.status}`
                );
            }

            const loggedUser =
                data?.user ||
                data?.data?.user ||
                data?.data ||
                data;

            if (!loggedUser) {
                throw new Error("User information was not returned.");
            }

            const role = String(loggedUser.role || "").trim().toUpperCase();

            if (!role) {
                throw new Error(
                    "Login successful, but account role was not returned by server."
                );
            }

            if (role !== selectedRole) {
                setError(
                    `This account is registered as ${roleLabel(
                        role
                    )}, not ${roleLabel(
                        selectedRole
                    )}. Select the "${roleLabel(
                        role
                    )}" tab and sign in again.`
                );

                setLoading(false);

                return;
            }

            const userToStore = {
                ...loggedUser,
                role
            };

            sessionStorage.setItem("user", JSON.stringify(userToStore));

            if (data?.token) {
                sessionStorage.setItem("token", data.token);
            }

            setSuccess("Login successful.");

            setTimeout(() => {
                redirectByRole(role);
            }, 500);

        } catch (err) {
            console.error("Login error:", err);
            setError(err.message || "Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!forgotEmail.trim()) {
            setError("Please enter your email.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: forgotEmail.trim()
                })
            });

            const contentType = response.headers.get("content-type") || "";
            let data = null;

            if (contentType.includes("application/json")) {
                data = await response.json();
            }

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Request failed. Status: ${response.status}`
                );
            }

            // Deliberately generic message — don't reveal whether the
            // email exists in the system.
            setSuccess(
                "If an account exists for that email, a reset link has been sent."
            );

        } catch (err) {
            console.error("Forgot password error:", err);
            setError(err.message || "Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    if (view === "forgot") {
        return (
            <div className="login-page">
                <div className="login-card">

                    <div className="login-header">
                        <div className="login-label">VISITOR PORTAL</div>
                        <h1>Reset your password</h1>
                        <p>Enter your email and we'll send you a reset link.</p>
                    </div>

                    <form onSubmit={handleForgotSubmit}>

                        <div className="login-field">
                            <label htmlFor="forgot-email">Email</label>
                            <input
                                id="forgot-email"
                                type="email"
                                name="forgotEmail"
                                placeholder="Enter your email"
                                value={forgotEmail}
                                onChange={(e) => {
                                    setForgotEmail(e.target.value);
                                    setError("");
                                    setSuccess("");
                                }}
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="login-message login-error">{error}</div>
                        )}

                        {success && (
                            <div className="login-message login-success">{success}</div>
                        )}

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? "Sending..." : "Send reset link"}
                        </button>

                    </form>

                    <div className="login-divider"></div>

                    <div className="login-register">
                        <button type="button" onClick={switchToLogin}>
                            Back to sign in
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="login-header">
                    <div className="login-label">VISITOR PORTAL</div>
                    <h1>Welcome back</h1>
                    <p>Sign in to access your visitor portal.</p>
                </div>

                <div
                    className="login-role-tabs"
                    style={{ display: "flex", gap: "8px", marginBottom: "20px" }}
                >
                    {ROLE_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => handleRoleTabClick(tab.value)}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: "10px 8px",
                                borderRadius: "8px",
                                border:
                                    selectedRole === tab.value
                                        ? "2px solid #2563eb"
                                        : "1px solid #d1d5db",
                                background:
                                    selectedRole === tab.value ? "#eff6ff" : "#ffffff",
                                color:
                                    selectedRole === tab.value ? "#1d4ed8" : "#374151",
                                fontWeight: selectedRole === tab.value ? 600 : 500,
                                cursor: loading ? "default" : "pointer"
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="login-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    <div style={{ textAlign: "right", marginBottom: "12px" }}>
                        <button
                            type="button"
                            onClick={switchToForgot}
                            disabled={loading}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                padding: 0
                            }}
                        >
                            Forgot password?
                        </button>
                    </div>

                    {error && (
                        <div className="login-message login-error">{error}</div>
                    )}

                    {success && (
                        <div className="login-message login-success">{success}</div>
                    )}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Signing in..." : `Sign in as ${roleLabel(selectedRole)}`}
                    </button>

                </form>

                <div className="login-divider"></div>

                <div className="login-register">
                    <span>Don't have an account?</span>
                    <button type="button" onClick={() => { window.location.href = "/register"; }}>
                        Create an account
                    </button>
                </div>

                <div className="login-footer">
                    <span>Shnool International LLC</span>
                    <span>Visitor Management System</span>
                </div>

            </div>

        </div>
    );
}

export default Login;
