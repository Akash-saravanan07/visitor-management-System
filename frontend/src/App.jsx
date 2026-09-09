import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Home from "./pages/Home";
import User from "./pages/user";
import AvailableSlots from "./pages/AvailableSlots";
import BookVisit from "./pages/BookVisit";
import MyBookings from "./pages/MyBookings";
import MyProfile from "./pages/MyProfile";
import SecurityDashboard from "./pages/SecurityDashboard";

import AdminDashboard from "./pages/Admindashboard";

// ============================================================
// GET CURRENT USER
//
// FIX: sessionStorage instead of localStorage. localStorage is
// shared across every tab of the same browser origin, so logging
// in as a different role (User / Security / Admin) in a second
// tab overwrote the "user" key for every open tab — which is why
// a page like Available Slots would suddenly bounce to Admin or
// Security mid-use. sessionStorage is scoped per tab, so each
// tab now keeps its own independent login and tabs stop
// interfering with each other. Every other file that reads or
// writes the "user" key (Login.jsx, Register.jsx, AdminDashboard,
// SecurityDashboard, BookVisit, MyBookings, MyProfile,
// AvailableSlots, User.jsx, etc.) must use sessionStorage too —
// otherwise you'll have some pages still fighting over
// localStorage while others use sessionStorage.
// ============================================================

function getUser() {

  const storedUser = sessionStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {

    return JSON.parse(storedUser);

  } catch (error) {

    console.error("Invalid user data");

    sessionStorage.removeItem("user");

    return null;
  }
}


// ============================================================
// ROLE HOME
// ============================================================

function RoleHome() {

  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }


  const role = String(user.role || "")
    .trim()
    .toUpperCase();


  if (role === "USER") {
    return <Navigate to="/user" replace />;
  }


  if (role === "SECURITY") {
    return <Navigate to="/security" replace />;
  }


  if (role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }


  return <Navigate to="/login" replace />;
}


// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({
  children,
  allowedRoles = []
}) {

  const user = getUser();


  if (!user) {
    return <Navigate to="/login" replace />;
  }


  const role = String(user.role || "")
    .trim()
    .toUpperCase();


  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {

    if (role === "USER") {
      return <Navigate to="/user" replace />;
    }


    if (role === "SECURITY") {
      return <Navigate to="/security" replace />;
    }


    if (role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }


    return <Navigate to="/login" replace />;
  }


  return children;
}


// ============================================================
// APP
// ============================================================

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={
            <RoleHome />
          }
        />

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        <Route
          path="/register"
          element={
            <Register />
          }
        />

        <Route
          path="/user"
          element={

            <ProtectedRoute
              allowedRoles={["USER"]}
            >

              <User />

            </ProtectedRoute>

          }
        />

        <Route
          path="/user/slots"
          element={

            <ProtectedRoute
              allowedRoles={["USER"]}
            >

              <AvailableSlots />

            </ProtectedRoute>

          }
        />

        <Route
          path="/user/book"
          element={

            <ProtectedRoute
              allowedRoles={["USER"]}
            >

              <BookVisit />

            </ProtectedRoute>

          }
        />

        <Route
          path="/user/bookings"
          element={

            <ProtectedRoute
              allowedRoles={["USER"]}
            >

              <MyBookings />

            </ProtectedRoute>

          }
        />

        <Route
          path="/user/profile"
          element={

            <ProtectedRoute
              allowedRoles={["USER"]}
            >

              <MyProfile />

            </ProtectedRoute>

          }
        />

        <Route
          path="/security"
          element={

            <ProtectedRoute
              allowedRoles={["SECURITY"]}
            >

              <SecurityDashboard />

            </ProtectedRoute>

          }
        />

        <Route
          path="/security/login"
          element={
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/security/register"
          element={
            <Navigate to="/register" replace />
          }
        />

        <Route
          path="/admin"
          element={

            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >

              <AdminDashboard />

            </ProtectedRoute>

          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>

  );
}

export default App;