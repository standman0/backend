import cron from "node-cron";
import Appointment from "../models/Appointment.js";
import { sendAppointmentReminder } from "../services/notificationService.js";

/* ---------------------------------------------
 * SEND REMINDERS FOR TOMORROW'S APPOINTMENTS
 * Runs daily at 10:00 AM
 * --------------------------------------------- */
const sendDailyReminders = async () => {
  try {
    console.log("Running daily appointment reminders...");

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

    // Find all confirmed appointments for tomorrow
    const appointments = await Appointment.find({
      date: tomorrowDate,
      status: { $in: ["confirmed", "pending"] },
    }).populate("clientId");

    console.log(`Found ${appointments.length} appointments for tomorrow (${tomorrowDate})`);

    // Send reminder for each appointment
    for (const appointment of appointments) {
      if (appointment.clientId) {
        try {
          const result = await sendAppointmentReminder(
            appointment,
            appointment.clientId
          );

          console.log(
            `Reminder sent for appointment ${appointment._id}:`,
            `Email: ${result.email.success}, SMS: ${result.sms.success}`
          );

          // Optional: Mark that reminder was sent
          appointment.reminderSent = true;
          appointment.reminderSentAt = new Date();
          await appointment.save();
        } catch (error) {
          console.error(
            `Failed to send reminder for appointment ${appointment._id}:`,
            error.message
          );
        }
      }
    }

    console.log("Daily reminders completed.");
  } catch (error) {
    console.error("Error in daily reminders cron job:", error.message);
  }
};

/* ---------------------------------------------
 * SCHEDULE CRON JOB
 * Format: minute hour day month weekday
 * Example: "0 10 * * *" = Every day at 10:00 AM
 * --------------------------------------------- */
const scheduleReminders = () => {
  // Run every day at 10:00 AM
 cron.schedule("0 9,17 * * *", sendDailyReminders, {
    timezone: "America/New_York", // Change to your timezone
  });

  console.log("✅ Reminder cron job scheduled: Daily at 10:00 AM");
};

/* ---------------------------------------------
 * MANUAL TRIGGER (for testing)
 * --------------------------------------------- */
export const triggerManualReminder = async () => {
  console.log("Manual reminder trigger...");
  await sendDailyReminders();
};

// Start the cron job
export default scheduleReminders;