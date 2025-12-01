import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import "./utils/dailyCron.js";

import clientRoutes from "./routes/clientsRoute.js";
import appointmentRoutes from "./routes/AppointmentRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import scheduleReminders from "./utils/reminderCron.js";

connectDB();

const app = express();

// CORS + JSON (ONE TIME ONLY!)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Nail Booking API is running...");
});

const PORT = process.env.PORT || 5000;  // ← Change to 5000 (standard)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

scheduleReminders();