// ============================================================
// SHNOOL VISITOR MANAGEMENT SYSTEM
// BACKEND SERVER
// ============================================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const crypto = require("crypto");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


// ============================================================
// DATABASE
// ============================================================

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ...(process.env.DB_SSL === "false"
        ? {}
        : { ssl: { rejectUnauthorized: false } })
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "shnoor_db"
    };

const pool = new Pool(poolConfig);


// ============================================================
// DATABASE CONNECTION TEST
// ============================================================

async function testDatabase() {

  try {

    const result =
      await pool.query(
        "SELECT NOW() AS time"
      );

    console.log("");
    console.log("========================================");
    console.log("PostgreSQL connected successfully");
    console.log(
      "Database time:",
      result.rows[0].time
    );
    console.log("========================================");
    console.log("");

    return true;

  } catch (error) {

    console.error("");
    console.error("========================================");
    console.error("DATABASE CONNECTION ERROR");
    console.error(error.message);
    console.error("========================================");
    console.error("");

    return false;

  }

}


// ============================================================
// CREATE USERS TABLE IF IT DOES NOT EXIST
// ============================================================

async function createUsersTable() {

  try {

    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (

        id SERIAL PRIMARY KEY,

        name VARCHAR(255),

        full_name VARCHAR(255),

        email VARCHAR(255)
          UNIQUE
          NOT NULL,

        phone VARCHAR(50),

        password TEXT
          NOT NULL,

        role VARCHAR(50)
          DEFAULT 'USER',

        account_type VARCHAR(50)
          DEFAULT 'USER',

        created_at TIMESTAMP
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP

      );
    `);

    console.log(
      "Users table ready."
    );

  } catch (error) {

    console.error(
      "USERS TABLE ERROR:"
    );

    console.error(
      error.message
    );

  }

}


// ============================================================
// CREATE BOOKINGS TABLE IF IT DOES NOT EXIST
// ============================================================

async function createBookingsTable() {

  try {

    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (

        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        visit_date DATE NOT NULL,

        visit_time VARCHAR(50) NOT NULL,

        purpose TEXT,

        status VARCHAR(50)
          NOT NULL
          DEFAULT 'PENDING',

        booking_token UUID
          NOT NULL
          UNIQUE
          DEFAULT gen_random_uuid(),

        created_at TIMESTAMP
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP

      );
    `);

    await pool.query(`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
    `);

    await pool.query(`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS verified_by INTEGER;
    `);

    console.log(
      "Bookings table ready."
    );

  } catch (error) {

    console.error(
      "BOOKINGS TABLE ERROR:"
    );

    console.error(
      error.message
    );

  }

}


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {

  res.json({

    success: true,

    message:
      "Shnool Visitor Management API is running",

    port: PORT

  });

});


// ============================================================
// TEST API
// ============================================================

app.get("/api/test", async (req, res) => {

  try {

    const result =
      await pool.query(
        "SELECT NOW() AS time"
      );

    res.json({

      success: true,

      message:
        "API and database are working",

      time:
        result.rows[0].time

    });

  } catch (error) {

    console.error(
      "API TEST ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Database connection failed",

      error:
        error.message

    });

  }

});


// ============================================================
// LOGIN
// ============================================================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;

      if (
        !email ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Email and password are required"

        });

      }

      const cleanEmail =
        String(email)
          .trim()
          .toLowerCase();

      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE LOWER(email) = $1
          LIMIT 1
          `,
          [cleanEmail]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password"

        });

      }

      const user =
        result.rows[0];

      let passwordCorrect =
        false;

      if (
        typeof user.password === "string" &&
        user.password.startsWith("$2")
      ) {

        passwordCorrect =
          await bcrypt.compare(
            password,
            user.password
          );

      } else {

        passwordCorrect =
          String(user.password) ===
          String(password);

      }

      if (!passwordCorrect) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password"

        });

      }

      res.json({

        success: true,

        message:
          "Login successful",

        user: {

          id:
            user.id ||
            user.user_id,

          user_id:
            user.user_id ||
            user.id,

          name:
            user.name ||
            user.full_name ||
            "",

          full_name:
            user.full_name ||
            user.name ||
            "",

          email:
            user.email,

          role:
            String(
              user.role ||
              "USER"
            )
              .trim()
              .toUpperCase()

        }

      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Login failed",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// REGISTER
// ============================================================

app.post(
  "/api/auth/register",
  async (req, res) => {

    try {

      const {
        name,
        full_name,
        email,
        phone,
        password,
        role,
        account_type
      } = req.body;

      const finalName =
        name ||
        full_name ||
        "";

      const finalRole =
        String(
          role ||
          account_type ||
          "USER"
        )
          .trim()
          .toUpperCase();

      if (
        !finalName ||
        !email ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Name, email and password are required"

        });

      }

      const cleanEmail =
        String(email)
          .trim()
          .toLowerCase();

      const existing =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE LOWER(email) = $1
          LIMIT 1
          `,
          [cleanEmail]
        );

      if (
        existing.rows.length > 0
      ) {

        return res.status(409).json({

          success: false,

          message:
            "Email already registered"

        });

      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const columnsResult =
        await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'users'
        `);

      const columns =
        columnsResult.rows.map(
          row =>
            row.column_name
        );

      const insertColumns = [];
      const insertValues = [];
      const params = [];

      let parameterNumber = 1;

      function addColumn(
        column,
        value
      ) {

        if (
          columns.includes(column)
        ) {

          insertColumns.push(
            column
          );

          insertValues.push(
            `$${parameterNumber}`
          );

          params.push(
            value
          );

          parameterNumber++;

        }

      }

      addColumn(
        "name",
        finalName
      );

      addColumn(
        "full_name",
        finalName
      );

      addColumn(
        "email",
        cleanEmail
      );

      addColumn(
        "phone",
        phone || ""
      );

      addColumn(
        "password",
        hashedPassword
      );

      addColumn(
        "role",
        finalRole
      );

      addColumn(
        "account_type",
        finalRole
      );

      if (
        insertColumns.length === 0
      ) {

        return res.status(500).json({

          success: false,

          message:
            "Could not find usable columns in users table"

        });

      }

      const insertQuery = `
        INSERT INTO users
        (${insertColumns.join(", ")})
        VALUES
        (${insertValues.join(", ")})
        RETURNING *
      `;

      const created =
        await pool.query(
          insertQuery,
          params
        );

      const newUser =
        created.rows[0];

      res.status(201).json({

        success: true,

        message:
          "Registration successful",

        user: {

          id:
            newUser.id ||
            newUser.user_id,

          user_id:
            newUser.user_id ||
            newUser.id,

          name:
            newUser.name ||
            newUser.full_name ||
            finalName,

          full_name:
            newUser.full_name ||
            newUser.name ||
            finalName,

          email:
            newUser.email ||
            cleanEmail,

          role:
            String(
              newUser.role ||
              finalRole
            )
              .trim()
              .toUpperCase()

        }

      });

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Registration failed",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET BOOKINGS FOR DATE
// ============================================================

app.get(
  "/api/bookings/date/:date",
  async (req, res) => {

    try {

      const {
        date
      } = req.params;

      console.log(
        "Loading bookings for date:",
        date
      );

      const result =
        await pool.query(
          `
          SELECT
            id,
            user_id,
            visit_date,
            visit_time,
            purpose,
            status,
            booking_token,
            created_at
          FROM bookings
          WHERE visit_date = $1
          AND UPPER(status)
              NOT IN (
                'CANCELLED',
                'CANCELED'
              )
          ORDER BY visit_time ASC
          `,
          [date]
        );

      res.status(200).json({

        success: true,

        bookings:
          result.rows

      });

    } catch (error) {

      console.error(
        "GET BOOKINGS BY DATE ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to load bookings",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET SECURITY CHECK-IN HISTORY FOR A DATE
// ============================================================

app.get(
  "/api/bookings/history/:date",
  async (req, res) => {

    try {

      const {
        date
      } = req.params;

      console.log(
        "Loading security history for date:",
        date
      );

      const result =
        await pool.query(
          `
          SELECT
            b.id,
            b.user_id,
            b.visit_date,
            b.visit_time,
            b.purpose,
            b.status,
            b.booking_token,
            b.created_at,
            b.verified_at,
            b.verified_by,

            u.full_name AS visitor_name,
            u.email AS visitor_email,
            u.phone AS visitor_phone,

            s.full_name AS verified_by_name

          FROM bookings b

          LEFT JOIN users u
            ON b.user_id = u.id

          LEFT JOIN users s
            ON b.verified_by = s.id

          WHERE b.verified_at IS NOT NULL
          AND b.verified_at::date = $1

          ORDER BY b.verified_at DESC
          `,
          [date]
        );

      res.status(200).json({

        success: true,

        history:
          result.rows

      });

    } catch (error) {

      console.error(
        "GET SECURITY HISTORY ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to load check-in history",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// CREATE BOOKING
// ============================================================

app.post(
  "/api/bookings",
  async (req, res) => {

    try {

      const {
        user_id,
        visit_date,
        visit_time,
        purpose
      } = req.body;

      console.log(
        "Creating booking:",
        req.body
      );

      if (
        !user_id ||
        !visit_date ||
        !visit_time
      ) {

        return res.status(400).json({

          success: false,

          message:
            "User ID, date and time are required"

        });

      }

      const userResult =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [
            Number(user_id)
          ]
        );

      if (
        userResult.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "User not found"

        });

      }

      const existingBooking =
        await pool.query(
          `
          SELECT
            id,
            user_id,
            visit_date,
            visit_time,
            status
          FROM bookings
          WHERE visit_date = $1
          AND visit_time = $2
          AND UPPER(status)
              NOT IN (
                'CANCELLED',
                'CANCELED'
              )
          LIMIT 1
          `,
          [
            visit_date,
            visit_time
          ]
        );

      if (
        existingBooking.rows.length > 0
      ) {

        return res.status(409).json({

          success: false,

          message:
            "This time slot is already booked"

        });

      }

      const bookingToken =
        crypto.randomUUID();

      const result =
        await pool.query(
          `
          INSERT INTO bookings
          (
            user_id,
            visit_date,
            visit_time,
            purpose,
            status,
            booking_token
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING
            id,
            user_id,
            visit_date,
            visit_time,
            purpose,
            status,
            booking_token,
            created_at
          `,
          [

            Number(user_id),

            visit_date,

            visit_time,

            purpose ||
              "VISIT",

            "PENDING",

            bookingToken

          ]
        );

      const booking =
        result.rows[0];

      console.log(
        "BOOKING CREATED SUCCESSFULLY:"
      );

      console.log(
        booking
      );

      return res.status(201).json({

        success: true,

        message:
          "Visit booked successfully",

        booking

      });

    } catch (error) {

      console.error(
        "CREATE BOOKING ERROR:",
        error
      );

      if (
        error.code === "23505"
      ) {

        return res.status(409).json({

          success: false,

          message:
            "This time slot is already booked"

        });

      }

      return res.status(500).json({

        success: false,

        message:
          "Failed to create booking",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET USER BOOKINGS
// ============================================================

app.get(
  "/api/bookings/user/:userId",
  async (req, res) => {

    try {

      const {
        userId
      } = req.params;

      if (!userId) {

        return res.status(400).json({

          success: false,

          message:
            "User ID is required"

        });

      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            user_id,
            visit_date,
            visit_time,
            purpose,
            status,
            booking_token,
            created_at
          FROM bookings
          WHERE user_id = $1
          ORDER BY
            visit_date DESC,
            visit_time DESC,
            id DESC
          `,
          [
            Number(userId)
          ]
        );

      res.status(200).json({

        success: true,

        bookings:
          result.rows

      });

    } catch (error) {

      console.error(
        "GET USER BOOKINGS ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to load user bookings",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET ALL BOOKINGS
// ============================================================

app.get(
  "/api/bookings",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            b.id,
            b.user_id,
            b.visit_date,
            b.visit_time,
            b.purpose,
            b.status,
            b.booking_token,
            b.created_at,

            u.full_name AS name,
            u.email AS email

          FROM bookings b

          LEFT JOIN users u
            ON b.user_id = u.id

          ORDER BY
            b.created_at DESC
          `
        );

      res.status(200).json({

        success: true,

        bookings:
          result.rows

      });

    } catch (error) {

      console.error(
        "GET ALL BOOKINGS ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to load bookings",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET ONE BOOKING
// ============================================================

app.get(
  "/api/bookings/:id",
  async (req, res) => {

    try {

      const {
        id
      } = req.params;

      const result =
        await pool.query(
          `
          SELECT
            b.id,
            b.user_id,
            b.visit_date,
            b.visit_time,
            b.purpose,
            b.status,
            b.booking_token,
            b.created_at,

            u.full_name AS name,
            u.email AS email

          FROM bookings b

          LEFT JOIN users u
            ON b.user_id = u.id

          WHERE b.id = $1

          LIMIT 1
          `,
          [
            Number(id)
          ]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Booking not found"

        });

      }

      res.status(200).json({

        success: true,

        booking:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "GET BOOKING ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to load booking",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET BOOKING BY TOKEN
// ============================================================

app.get(
  "/api/bookings/token/:token",
  async (req, res) => {

    try {

      const {
        token
      } = req.params;

      const result =
        await pool.query(
          `
          SELECT
            b.id,
            b.user_id,
            b.visit_date,
            b.visit_time,
            b.purpose,
            b.status,
            b.booking_token,
            b.created_at,

            u.full_name,
            u.email,
            u.phone

          FROM bookings b

          LEFT JOIN users u
            ON b.user_id = u.id

          WHERE b.booking_token = $1

          LIMIT 1
          `,
          [token]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Invalid booking QR"

        });

      }

      res.status(200).json({

        success: true,

        booking:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "QR BOOKING ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to verify QR",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// APPROVE BOOKING
// ============================================================

async function approveBookingHandler(req, res) {

  try {

    const {
      id
    } = req.params;

    const {
      security_user_id
    } = req.body || {};

    const securityUserId =
      security_user_id
        ? Number(security_user_id)
        : null;

    const result =
      await pool.query(
        `
        UPDATE bookings

        SET
          status = 'APPROVED',
          verified_at = CURRENT_TIMESTAMP,
          verified_by = $2

        WHERE id = $1

        RETURNING
          id,
          user_id,
          visit_date,
          visit_time,
          purpose,
          status,
          booking_token,
          created_at,
          verified_at,
          verified_by
        `,
        [
          Number(id),
          securityUserId
        ]
      );

    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Booking not found"

      });

    }

    res.status(200).json({

      success: true,

      message:
        "Booking approved successfully",

      booking:
        result.rows[0]

    });

  } catch (error) {

    console.error(
      "APPROVE BOOKING ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Failed to approve booking",

      error:
        error.message

    });

  }

}

app.put("/api/bookings/:id/approve", approveBookingHandler);
app.patch("/api/bookings/:id/approve", approveBookingHandler);


// ============================================================
// CANCEL BOOKING
// ============================================================

async function cancelBookingHandler(req, res) {

  try {

    const {
      id
    } = req.params;

    const result =
      await pool.query(
        `
        UPDATE bookings

        SET status = 'CANCELLED'

        WHERE id = $1

        RETURNING
          id,
          user_id,
          visit_date,
          visit_time,
          purpose,
          status,
          booking_token,
          created_at
        `,
        [
          Number(id)
        ]
      );

    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Booking not found"

      });

    }

    res.status(200).json({

      success: true,

      message:
        "Booking cancelled successfully",

      booking:
        result.rows[0]

    });

  } catch (error) {

    console.error(
      "CANCEL BOOKING ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Failed to cancel booking",

      error:
        error.message

    });

  }

}

app.put("/api/bookings/:id/cancel", cancelBookingHandler);
app.patch("/api/bookings/:id/cancel", cancelBookingHandler);


// ============================================================
// DELETE BOOKING
// ============================================================

app.delete(
  "/api/bookings/:id",
  async (req, res) => {

    try {

      const {
        id
      } = req.params;

      const result =
        await pool.query(
          `
          DELETE FROM bookings

          WHERE id = $1

          RETURNING *
          `,
          [
            Number(id)
          ]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Booking not found"

        });

      }

      res.status(200).json({

        success: true,

        message:
          "Booking deleted successfully",

        booking:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "DELETE BOOKING ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to delete booking",

        error:
          error.message

      });

    }

  }
);


// ============================================================
// ADMIN DASHBOARD ROUTES
//
// FIX: every route below moved from /admin/... to /api/admin/...
// Vercel's rewrite/routing configuration only forwards requests
// starting with /api/ to this Express app — anything else (like
// the old /admin/... paths) fell through to the frontend's own
// index.html, which is why the browser was getting back
// "<!doctype html>..." instead of JSON.
// ============================================================

const STATUS_DISPLAY = {
  PENDING:   { label: "Pending",   color: "#f59e0b" },
  APPROVED:  { label: "Approved",  color: "#2563eb" },
  COMPLETED: { label: "Completed", color: "#16a34a" },
  CANCELLED: { label: "Cancelled", color: "#dc2626" },
  CANCELED:  { label: "Cancelled", color: "#dc2626" },
  ABSENT:    { label: "Absent",    color: "#dc2626" },
};

function displayStatus(rawStatus) {
  const key = String(rawStatus || "").trim().toUpperCase();
  return (STATUS_DISPLAY[key] || { label: "Pending", color: "#f59e0b" }).label;
}


app.get("/api/admin/stats", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM bookings) AS bookings,
        (SELECT COUNT(*)::int FROM bookings
           WHERE UPPER(status) = 'PENDING') AS pending,
        (SELECT COUNT(*)::int FROM bookings
           WHERE UPPER(status) = 'COMPLETED') AS completed
    `);

    res.status(200).json(result.rows[0]);

  } catch (error) {

    console.error("ADMIN STATS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load admin stats",
      error: error.message
    });

  }

});


app.get("/api/admin/bookings/weekly", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        to_char(d.day, 'Dy') AS day,
        COUNT(b.id)::int AS value
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS d(day)
      LEFT JOIN bookings b
        ON b.visit_date = d.day
      GROUP BY d.day
      ORDER BY d.day
    `);

    res.status(200).json(result.rows);

  } catch (error) {

    console.error("ADMIN WEEKLY BOOKINGS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load weekly bookings",
      error: error.message
    });

  }

});


app.get("/api/admin/bookings/status", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT UPPER(status) AS status, COUNT(*)::int AS value
      FROM bookings
      GROUP BY UPPER(status)
    `);

    const breakdown = result.rows.map((row) => {
      const display = STATUS_DISPLAY[row.status] || { label: row.status, color: "#9ca3af" };
      return {
        label: display.label,
        value: row.value,
        color: display.color
      };
    });

    res.status(200).json(breakdown);

  } catch (error) {

    console.error("ADMIN BOOKING STATUS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load booking status breakdown",
      error: error.message
    });

  }

});


app.get("/api/admin/visitors/today", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        b.visit_time AS time,
        COALESCE(u.full_name, 'Unknown') AS name,
        COALESCE(b.purpose, 'General visit') AS purpose,
        b.status AS status
      FROM bookings b
      LEFT JOIN users u
        ON b.user_id = u.id
      WHERE b.visit_date = CURRENT_DATE
      ORDER BY b.visit_time ASC
    `);

    const visitors = result.rows.map((row) => ({
      time: row.time,
      name: row.name,
      purpose: row.purpose,
      status: displayStatus(row.status)
    }));

    res.status(200).json(visitors);

  } catch (error) {

    console.error("ADMIN VISITORS TODAY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load today's visitors",
      error: error.message
    });

  }

});


app.get("/api/admin/bookings", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        b.id,
        COALESCE(u.full_name, 'Unknown') AS visitor,
        b.visit_date AS date,
        b.visit_time AS time,
        b.purpose,
        b.status
      FROM bookings b
      LEFT JOIN users u
        ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);

    const bookings = result.rows.map((row) => ({
      id: row.id,
      visitor: row.visitor,
      host: "—",
      date: row.date,
      time: row.time,
      purpose: row.purpose,
      status: displayStatus(row.status)
    }));

    res.status(200).json(bookings);

  } catch (error) {

    console.error("ADMIN GET BOOKINGS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load bookings",
      error: error.message
    });

  }

});


app.patch("/api/admin/bookings/:id", async (req, res) => {

  try {

    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const dbStatus = String(status).trim().toUpperCase();

    const result = await pool.query(
      `
      UPDATE bookings
      SET status = $2
      WHERE id = $1
      RETURNING
        id, user_id, visit_date, visit_time, purpose,
        status, booking_token, created_at
      `,
      [Number(id), dbStatus]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      booking: result.rows[0]
    });

  } catch (error) {

    console.error("ADMIN PATCH BOOKING ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update booking",
      error: error.message
    });

  }

});


app.get("/api/admin/visitors", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name AS name,
        u.email,
        u.phone,
        COUNT(b.id)::int AS "totalBookings",
        MAX(b.visit_date) AS "lastVisit"
      FROM users u
      JOIN bookings b
        ON b.user_id = u.id
      GROUP BY u.id, u.full_name, u.email, u.phone
      ORDER BY MAX(b.visit_date) DESC
    `);

    res.status(200).json(result.rows);

  } catch (error) {

    console.error("ADMIN GET VISITORS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load visitors",
      error: error.message
    });

  }

});


app.get("/api/admin/visitors/current", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        b.id,
        COALESCE(u.full_name, 'Unknown') AS name,
        b.purpose,
        b.visit_time AS "checkInTime",
        b.status
      FROM bookings b
      LEFT JOIN users u
        ON b.user_id = u.id
      WHERE UPPER(b.status) = 'APPROVED'
      AND b.visit_date = CURRENT_DATE
      ORDER BY b.visit_time ASC
    `);

    const visitors = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      purpose: row.purpose,
      checkInTime: row.checkInTime,
      visit_time: row.checkInTime,
      status: displayStatus(row.status)
    }));

    res.status(200).json(visitors);

  } catch (error) {

    console.error("ADMIN GET CURRENT VISITORS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load current visitors",
      error: error.message
    });

  }

});


app.get("/api/admin/visitors/completed", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        b.id,
        COALESCE(u.full_name, 'Unknown') AS name,
        b.visit_date AS date,
        b.visit_time AS time,
        b.purpose,
        b.status
      FROM bookings b
      LEFT JOIN users u
        ON b.user_id = u.id
      WHERE UPPER(b.status) IN ('COMPLETED', 'ABSENT')
      ORDER BY b.visit_date DESC, b.visit_time DESC
    `);

    const records = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      date: row.date,
      time: row.time,
      purpose: row.purpose,
      status: displayStatus(row.status)
    }));

    res.status(200).json(records);

  } catch (error) {

    console.error("ADMIN GET COMPLETED ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load completed visits",
      error: error.message
    });

  }

});


// ============================================================
// 404 HANDLER
// ============================================================

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        `Route not found: ${req.method} ${req.originalUrl}`

    });

  }
);


// ============================================================
// DATABASE INITIALIZATION
// ============================================================

async function initDatabase() {

  const dbConnected =
    await testDatabase();

  if (!dbConnected) {

    console.error(
      "Database connection failed at startup — check DB env vars."
    );

  }

  await createUsersTable();

  await createBookingsTable();

}

initDatabase();


// ============================================================
// START SERVER (LOCAL ONLY)
// ============================================================

if (require.main === module) {

  app.listen(
    PORT,
    () => {

      console.log("");

      console.log(
        "========================================"
      );

      console.log(
        "SHNOOL VISITOR MANAGEMENT SERVER"
      );

      console.log(
        "========================================"
      );

      console.log(
        `Server: http://localhost:${PORT}`
      );

      console.log(
        `API:    http://localhost:${PORT}/api/test`
      );

      console.log(
        "Bookings API: READY"
      );

      console.log(
        "========================================"
      );

      console.log("");

    }
  );

}

module.exports = app;


// ============================================================
// ERROR HANDLERS
// ============================================================

process.on(
  "unhandledRejection",
  (error) => {

    console.error(
      "Unhandled rejection:",
      error
    );

  }
);


process.on(
  "uncaughtException",
  (error) => {

    console.error(
      "Uncaught exception:",
      error
    );

  }
);
