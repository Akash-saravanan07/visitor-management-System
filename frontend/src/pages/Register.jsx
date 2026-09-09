import React, { useState } from "react";
import "./register.css";
import { API_BASE } from "../services/api";

const API_URL = `${API_BASE}/api/auth`;

const ROLE_TABS = [
    { value: "USER", label: "User", description: "User accounts can book and manage visitor appointments." },
    { value: "SECURITY", label: "Security", description: "Security accounts can verify visitor bookings and manage visitor entry." },
    { value: "ADMIN", label: "Admin", description: "Admin accounts can manage the complete visitor management system." }
];

function Register() {

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "USER"
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
        setFormData((prev) => ({
            ...prev,
            role
        }));

        setError("");
        setSuccess("");
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        const name = formData.name.trim();
        const email = formData.email.trim();
        const phone = formData.phone.trim();
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;
        const role = String(formData.role)
            .trim()
            .toUpperCase();

        /* =========================
           VALIDATION
        ========================= */

        if (!name) {
            setError("Please enter your full name.");
            return;
        }

        if (name.length < 2) {
            setError("Full name must contain at least 2 characters.");
            return;
        }

        if (!email) {
            setError("Please enter your email.");
            return;
        }

        if (!email.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!phone) {
            setError("Please enter your phone number.");
            return;
        }

        if (!password) {
            setError("Please enter a password.");
            return;
        }

        if (password.length < 6) {
            setError(
                "Password must contain at least 6 characters."
            );
            return;
        }

        if (!confirmPassword) {
            setError("Please confirm your password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!["USER", "SECURITY", "ADMIN"].includes(role)) {
            setError("Please select a valid account type.");
            return;
        }

        setLoading(true);

        try {

            const response = await fetch(
                `${API_URL}/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        password,
                        role
                    })
                }
            );

            const contentType =
                response.headers.get("content-type") || "";

            let data;

            if (contentType.includes("application/json")) {

                data = await response.json();

            } else {

                const text = await response.text();

                console.error(
                    "Server returned non-JSON:",
                    text
                );

                throw new Error(
                    `Server returned invalid response. Status: ${response.status}`
                );
            }

            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Registration failed. Status: ${response.status}`
                );
            }

            setSuccess(
                "Account created successfully. Redirecting to login..."
            );

            setFormData({
                name: "",
                email: "",
                phone: "",
                password: "",
                confirmPassword: "",
                role: "USER"
            });

            setTimeout(() => {
                window.location.href = "/login";
            }, 1200);

        } catch (err) {

            console.error(
                "Registration error:",
                err
            );

            setError(
                err.message ||
                "Unable to connect to the server."
            );

        } finally {

            setLoading(false);

        }
    };

    const activeTab = ROLE_TABS.find(
        (tab) => tab.value === formData.role
    );

    return (
        <div className="register-page">

            <div className="register-card">

                <div className="register-header">

                    <div className="register-label">
                        VISITOR PORTAL
                    </div>

                    <h1>
                        Create your account
                    </h1>

                    <p>
                        Register to access the visitor management system.
                    </p>

                </div>

                {/* ROLE TABS (replaces the old dropdown) */}

                <div
                    className="register-role-tabs"
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
                                    formData.role === tab.value
                                        ? "2px solid #2563eb"
                                        : "1px solid #d1d5db",
                                background:
                                    formData.role === tab.value
                                        ? "#eff6ff"
                                        : "#ffffff",
                                color:
                                    formData.role === tab.value
                                        ? "#1d4ed8"
                                        : "#374151",
                                fontWeight:
                                    formData.role === tab.value
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

                    {/* FULL NAME */}

                    <div className="register-field">

                        <label htmlFor="name">
                            Full Name
                        </label>

                        <input
                            id="name"
                            type="text"
                            name="name"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={handleChange}
                            autoComplete="name"
                            disabled={loading}
                        />

                    </div>

                    {/* EMAIL */}

                    <div className="register-field">

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

                    {/* PHONE */}

                    <div className="register-field">

                        <label htmlFor="phone">
                            Phone
                        </label>

                        <input
                            id="phone"
                            type="tel"
                            name="phone"
                            placeholder="Enter your phone number"
                            value={formData.phone}
                            onChange={handleChange}
                            autoComplete="tel"
                            disabled={loading}
                        />

                    </div>

                    {/* PASSWORD */}

                    <div className="register-field">

                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={handleChange}
                            autoComplete="new-password"
                            disabled={loading}
                        />

                    </div>

                    {/* CONFIRM PASSWORD */}

                    <div className="register-field">

                        <label htmlFor="confirmPassword">
                            Confirm Password
                        </label>

                        <input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            autoComplete="new-password"
                            disabled={loading}
                        />

                    </div>

                    {/* ROLE DESCRIPTION */}

                    <div className="role-description">

                        {activeTab?.description}

                    </div>

                    {/* ERROR */}

                    {error && (
                        <div className="register-message register-error">
                            {error}
                        </div>
                    )}

                    {/* SUCCESS */}

                    {success && (
                        <div className="register-message register-success">
                            {success}
                        </div>
                    )}

                    {/* BUTTON */}

                    <button
                        type="submit"
                        className="register-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating account..."
                            : `Create ${activeTab?.label || ""} Account`}
                    </button>

                </form>

                <div className="register-login">

                    <span>
                        Already have an account?
                    </span>

                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = "/login";
                        }}
                    >
                        Sign in
                    </button>

                </div>

                <div className="register-footer">

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

export default Register;