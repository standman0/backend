import express from "express";
import {
  createAppointment,
  getAllAppointments,
  getSingleAppointment,
  getAppointmentsForDate,
  getAvailableSlots,
  updateAppointment,
  updateStatus,
  cancelAppointment,
  deleteAppointment,
  getAppointmentsByClient,
} from "../controllers/appointmentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// PUBLIC ROUTES (no authentication required)
router.get("/slots", getAvailableSlots); // Anyone can check available slots

// PROTECTED ROUTES (authentication required)
router.post("/", authMiddleware, createAppointment); // Authenticated users can book
router.get("/my-appointments", authMiddleware, getAppointmentsByClient); // User's own appointments

// ADMIN ONLY ROUTES
router.get("/", authMiddleware, adminOnly, getAllAppointments); // Admin view all
router.get("/by-date", authMiddleware, adminOnly, getAppointmentsForDate); // Admin view by date
router.get("/:id", authMiddleware, getSingleAppointment); // User can view their own, admin can view all
router.put("/:id", authMiddleware, updateAppointment); // User can reschedule their own
router.patch("/:id/status", authMiddleware, adminOnly, updateStatus); // Admin only
router.patch("/:id/cancel", authMiddleware, cancelAppointment); // User can cancel their own
router.delete("/:id", authMiddleware, adminOnly, deleteAppointment); // Admin only

export default router;