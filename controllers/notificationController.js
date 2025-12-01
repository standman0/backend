import Appointment from "../models/Appointment.js";
import { 
  sendAppointmentReminder,
  sendEmail,
  sendSMS,
} from "../services/notificationService.js";

/* ---------------------------------------------
 * SEND TEST EMAIL
 * --------------------------------------------- */
export const sendTestEmail = async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        message: "to, subject, and message are required",
      });
    }

    const result = await sendEmail(to, subject, message);

    res.json({
      message: "Email sent",
      result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * SEND TEST SMS
 * --------------------------------------------- */
export const sendTestSMS = async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        message: "to and message are required",
      });
    }

    const result = await sendSMS(to, message);

    res.json({
      message: "SMS sent",
      result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * SEND REMINDER FOR SPECIFIC APPOINTMENT
 * --------------------------------------------- */
export const sendManualReminder = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId).populate(
      "clientId"
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.clientId) {
      return res.status(404).json({ message: "Client not found" });
    }

    const result = await sendAppointmentReminder(
      appointment,
      appointment.clientId
    );

    // Mark reminder as sent
    appointment.reminderSent = true;
    appointment.reminderSentAt = new Date();
    await appointment.save();

    res.json({
      message: "Reminder sent",
      result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * SEND REMINDERS FOR ALL TOMORROW'S APPOINTMENTS
 * --------------------------------------------- */
export const sendTomorrowReminders = async (req, res) => {
  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];

    // Find all confirmed appointments for tomorrow
    const appointments = await Appointment.find({
      date: tomorrowDate,
      status: { $in: ["confirmed", "pending"] },
      reminderSent: false, // Only send if not already sent
    }).populate("clientId");

    if (appointments.length === 0) {
      return res.json({
        message: "No appointments found for tomorrow",
        count: 0,
      });
    }

    const results = [];

    // Send reminder for each appointment
    for (const appointment of appointments) {
      if (appointment.clientId) {
        try {
          const result = await sendAppointmentReminder(
            appointment,
            appointment.clientId
          );

          // Mark reminder as sent
          appointment.reminderSent = true;
          appointment.reminderSentAt = new Date();
          await appointment.save();

          results.push({
            appointmentId: appointment._id,
            client: appointment.clientId.fullName,
            result,
          });
        } catch (error) {
          results.push({
            appointmentId: appointment._id,
            error: error.message,
          });
        }
      }
    }

    res.json({
      message: "Reminders sent",
      date: tomorrowDate,
      count: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * GET NOTIFICATION SETTINGS STATUS
 * --------------------------------------------- */
export const getNotificationStatus = async (req, res) => {
  try {
    const status = {
      email: {
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
        user: process.env.EMAIL_USER || "Not configured",
      },
      sms: {
        configured: !!(
          process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_PHONE_NUMBER
        ),
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || "Not configured",
      },
      business: {
        name: process.env.BUSINESS_NAME || "Nail Salon",
        contactEmail: process.env.CONTACT_EMAIL || "Not set",
        contactPhone: process.env.CONTACT_PHONE || "Not set",
      },
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};