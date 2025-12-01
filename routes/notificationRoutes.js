import express from "express";
import {
  sendTestEmail,
  sendTestSMS,
  sendManualReminder,
  sendTomorrowReminders,
  getNotificationStatus,
} from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// All notification routes require admin authentication
router.use(authMiddleware, adminOnly);

// Get notification configuration status
router.get("/status", getNotificationStatus);

// Send test email
router.post("/test/email", sendTestEmail);

// Send test SMS
router.post("/test/sms", sendTestSMS);

// Send reminder for specific appointment
router.post("/reminder/:appointmentId", sendManualReminder);

// Send reminders for all tomorrow's appointments
router.post("/reminders/tomorrow", sendTomorrowReminders);

export default router;