import React, { useState } from "react";
import "./login.css";
import { API_BASE } from "../services/api";

const API_URL = `${API_BASE}/api/auth`;

const ROLE_TABS = [
    { value: "USER", label: "User" },
    { value: "SECURITY", label: "Security" },
    { value: "ADMIN", label: "Admin" }
];

// FIX: sessionStorage instead of localStorage. localStorage is shared
// across every tab of the same browser origin, so logging in as a
// different role in a second tab overwrote the "user" key for every
// open tab, which is why other tabs (e.g. Available Slots) suddenly
// jumped to a different dashboard mid-use. sessionStorage is scoped
// per tab, so each tab now keeps its own independent login.

function Login() {
    const [selectedRole, setSelectedRole] = useState("USER");

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

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
        const normalizedRole = String(role || "")
            .trim()
            .toUpperCase();

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
        const found = ROLE_TABS.find(
            (tab) => tab.value === role
        );

        return found ? found.label : role;
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

            const contentType =
                response.headers.get("content-type") || "";

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

            /*
             * Backend may return:
             *
             * {
             *   user: {
             *      id,
             *      name,
             *      email,
             *      phone,
             *      role
             *   }
             * }
             *
             * OR directly:
             *
             * {
             *   id,
             *   name,
             *   email,
             *   role
             * }
             */

            const loggedUser =
                data?.user ||
                data?.data?.user ||
                data?.data ||
                data;

            if (!loggedUser) {
                throw new Error("User information was not returned.");
            }

            const role = String(loggedUser.role || "")
                .trim()
                .toUpperCase();

            if (!role) {
                throw new Error(
                    "Login successful, but account role was not returned by server."
                );
            }

            // ------------------------------------------------------
            // ROLE TAB CHECK
            //
            // The tab the user picked is just a UI convenience —
            // the account's real role always comes from the
            // backend. If they don't match, block the login instead
            // of silently sending them to the wrong dashboard.
            // ------------------------------------------------------

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

            // FIX: was localStorage — see note at top of file.
            sessionStorage.setItem(
                "user",
                JSON.stringify(userToStore)
            );

            if (data?.token) {
                sessionStorage.setItem("token", data.token); // FIX: was localStorage
            }

            setSuccess("Login successful.");

            setTimeout(() => {
                redirectByRole(role);
            }, 500);

        } catch (err) {
            console.error("Login error:", err);

            setError(
                err.message ||
                "Unable to connect to the server."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="login-header">

                    <div className="login-label">
                        VISITOR PORTAL
                    </div>

                    <h1>
                        Welcome back
                    </h1>

                    <p>
                        Sign in to access your visitor portal.
                    </p>

                </div>

                {/* ROLE TABS */}

                <div
                    className="login-role-tabs"
                    style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "20px"
                    }}
                >

                    {ROLE_TABS.map((tab) => (

                        <button
                            key={tab.value}
                            type="button"
                            onClick={() =>
                                handleRoleTabClick(tab.value)
                            }
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
                                    selectedRole === tab.value
                                        ? "#eff6ff"
                                        : "#ffffff",
                                color:
                                    selectedRole === tab.value
                                        ? "#1d4ed8"
                                        : "#374151",
                                fontWeight:
                                    selectedRole === tab.value
                                        ? 600
                                        : 500,
                                cursor: loading
                                    ? "default"
                                    : "pointer"
                            }}
                        >
                            {tab.label}
                        </button>

                    ))}

                </div>

                <form onSubmit={handleSubmit}>

                    <div className="login-field">

                        <label htmlFor="email">
                            Email
                        </label>

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

                        <label htmlFor="password">
                            Password
                        </label>

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

                    {error && (
                        <div className="login-message login-error">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="login-message login-success">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : `Sign in as ${roleLabel(selectedRole)}`}
                    </button>

                </form>

                <div className="login-divider"></div>

                <div className="login-register">

                    <span>
                        Don't have an account?
                    </span>

                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = "/register";
                        }}
                    >
                        Create an account
                    </button>

                </div>

                <div className="login-footer">

                    <span>
                        Shnool International LLC
                    </span>

                    <span>
                        Visitor Management System
                    </span>

                </div>

            </div>

        </div>
    );
}

export default Login;
