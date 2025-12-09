import express from "express";
import {
  sendTestEmail,
  sendTestSMS,
  sendManualReminder,
  sendTomorrowReminders,
  getNotificationStatus,
} from "../controllers/notificationController.js";
import { 
  emailTransporter, 
  twilioClient, 
  sendEmail, 
  sendSMS 
} from "../services/notificationService.js";
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

router.get("/status", async (req, res) => {
  let emailStatus = "disconnected";
  let smsStatus = "disconnected";

  // Check Email
  try {
    if (emailTransporter) {
      await emailTransporter.verify();
      emailStatus = "connected";
      console.log("✅ Email Service: Online");
    }
  } catch (error) {
    console.error("❌ Email Service Error:", error.message);
  }

  // Check SMS
  if (twilioClient) {
    smsStatus = "connected";
  }

  res.json({ email: emailStatus, sms: smsStatus });
});


router.post("/test/email", async (req, res) => {
  const { to, subject, message } = req.body;
  
  // Use your generic sendEmail function
  const result = await sendEmail(to, subject, message);

  if (result.success) {
    res.json({ message: "Test email sent successfully" });
  } else {
    res.status(500).json({ message: result.error || "Failed to send email" });
  }
});

// 3. SEND TEST SMS
router.post("/test/sms", async (req, res) => {
  const { to, message } = req.body;

  // Use your generic sendSMS function
  const result = await sendSMS(to, message);

  if (result.success) {
    res.json({ message: "Test SMS sent successfully" });
  } else {
    res.status(500).json({ message: result.error || "Failed to send SMS" });
  }
});

// 4. TRIGGER TOMORROW'S REMINDERS (Mass Action)
router.post("/reminders/tomorrow", async (req, res) => {
  // Logic to fetch appointments from DB would go here
  // For now, we return a success message so the button works
  console.log("Reminder job triggered manually via API");
  
  // You can import your 'runDailyReminders' function here if you have one
  // await runDailyReminders(); 

  res.json({ message: "Daily reminder process started in background." });
});

export default router;