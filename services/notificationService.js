import nodemailer from "nodemailer";
import twilio from "twilio";
import { formatPhone } from "../utils/formatPhone.js";


/* ---------------------------------------------
 * EMAIL CONFIGURATION
 * --------------------------------------------- */
const emailTransporter = nodemailer.createTransport({
  service: "gmail", // or any other email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password
  },
});

/* ---------------------------------------------
 * SMS CONFIGURATION (Twilio)
 * --------------------------------------------- */
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/* ---------------------------------------------
 * SEND EMAIL
 * --------------------------------------------- */
export const sendEmail = async (to, subject, text, html = null) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("Email not configured. Skipping email send.");
      return { success: false, message: "Email not configured" };
    }

    const mailOptions = {
      from: `${process.env.BUSINESS_NAME || "Nail Salon"} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

/* ---------------------------------------------
 * SEND SMS
 * --------------------------------------------- */
/* ---------------------------------------------
 * SEND SMS (WITH PROPER PHONE FORMAT)
 * --------------------------------------------- */
export const sendSMS = async (to, message) => {
  try {
    if (!twilioClient) {
      console.log("SMS not configured. Skipping SMS send.");
      return { success: false, message: "SMS not configured" };
    }

    // Clean + convert to E.164 format
    const formattedPhone = formatPhone(to);

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log("SMS sent:", result.sid);
    return { success: true, sid: result.sid, to: formattedPhone };
  } catch (error) {
    console.error("SMS send error:", error.message);
    return { success: false, error: error.message };
  }
};


/* ---------------------------------------------
 * APPOINTMENT CONFIRMATION
 * --------------------------------------------- */
export const sendAppointmentConfirmation = async (appointment, client) => {
  const { date, time, serviceName, notes } = appointment;
  const { fullName, email, phone } = client;

  // Format date nicely
  const appointmentDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Email content
  const emailSubject = "Appointment Confirmation";
  const emailText = `
Hi ${fullName},

Your appointment has been confirmed!

Service: ${serviceName}
Date: ${appointmentDate}
Time: ${time}
${notes ? `Notes: ${notes}` : ""}

We look forward to seeing you!

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
${process.env.BUSINESS_NAME || "Nail Salon"}
  `;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
    .content { padding: 20px 0; }
    .appointment-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Appointment Confirmation</h2>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>Your appointment has been confirmed!</p>
      <div class="appointment-details">
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${time}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
      </div>
      <p>We look forward to seeing you!</p>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>${process.env.BUSINESS_NAME || "Nail Salon"}</p>
      ${process.env.CONTACT_PHONE ? `<p>Phone: ${process.env.CONTACT_PHONE}</p>` : ""}
      ${process.env.CONTACT_EMAIL ? `<p>Email: ${process.env.CONTACT_EMAIL}</p>` : ""}
    </div>
  </div>
</body>
</html>
  `;

  // SMS content (shorter)
  const smsMessage = `Hi ${fullName}! Your appointment for ${serviceName} is confirmed for ${appointmentDate} at ${time}. See you soon! - ${process.env.BUSINESS_NAME || "Nail Salon"}`;

  // Send email
  const emailResult = await sendEmail(email, emailSubject, emailText, emailHtml);

  // Send SMS if phone is provided
  let smsResult = { success: false, message: "No phone number" };
  if (phone) {
    smsResult = await sendSMS(phone, smsMessage);
  }

  return {
    email: emailResult,
    sms: smsResult,
  };
};

/* ---------------------------------------------
 * APPOINTMENT REMINDER (24 hours before)
 * --------------------------------------------- */
export const sendAppointmentReminder = async (appointment, client) => {
  const { date, time, serviceName } = appointment;
  const { fullName, email, phone } = client;

  const appointmentDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Email content
  const emailSubject = "Appointment Reminder - Tomorrow!";
  const emailText = `
Hi ${fullName},

This is a friendly reminder about your upcoming appointment tomorrow!

Service: ${serviceName}
Date: ${appointmentDate}
Time: ${time}

We look forward to seeing you!

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
${process.env.BUSINESS_NAME || "Nail Salon"}
  `;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #fff3cd; padding: 20px; text-align: center; border-radius: 5px; }
    .content { padding: 20px 0; }
    .appointment-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⏰ Appointment Reminder</h2>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>This is a friendly reminder about your upcoming appointment <strong>tomorrow</strong>!</p>
      <div class="appointment-details">
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${time}</p>
      </div>
      <p>We look forward to seeing you!</p>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>${process.env.BUSINESS_NAME || "Nail Salon"}</p>
      ${process.env.CONTACT_PHONE ? `<p>Phone: ${process.env.CONTACT_PHONE}</p>` : ""}
    </div>
  </div>
</body>
</html>
  `;

  // SMS content
  const smsMessage = `Reminder: ${fullName}, your appointment for ${serviceName} is tomorrow at ${time}. See you soon! - ${process.env.BUSINESS_NAME || "Nail Salon"}`;

  // Send notifications
  const emailResult = await sendEmail(email, emailSubject, emailText, emailHtml);
  
  let smsResult = { success: false, message: "No phone number" };
  if (phone) {
    smsResult = await sendSMS(phone, smsMessage);
  }

  return {
    email: emailResult,
    sms: smsResult,
  };
};

/* ---------------------------------------------
 * APPOINTMENT CANCELLATION
 * --------------------------------------------- */
export const sendCancellationNotification = async (appointment, client) => {
  const { date, time, serviceName } = appointment;
  const { fullName, email, phone } = client;

  const appointmentDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Email content
  const emailSubject = "Appointment Cancelled";
  const emailText = `
Hi ${fullName},

Your appointment has been cancelled.

Service: ${serviceName}
Date: ${appointmentDate}
Time: ${time}

If you'd like to reschedule, please contact us or book a new appointment.

Best regards,
${process.env.BUSINESS_NAME || "Nail Salon"}
  `;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8d7da; padding: 20px; text-align: center; border-radius: 5px; }
    .content { padding: 20px 0; }
    .appointment-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Appointment Cancelled</h2>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>Your appointment has been cancelled.</p>
      <div class="appointment-details">
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${time}</p>
      </div>
      <p>If you'd like to reschedule, please contact us or book a new appointment.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>${process.env.BUSINESS_NAME || "Nail Salon"}</p>
      ${process.env.CONTACT_PHONE ? `<p>Phone: ${process.env.CONTACT_PHONE}</p>` : ""}
    </div>
  </div>
</body>
</html>
  `;

  // SMS content
  const smsMessage = `${fullName}, your appointment for ${serviceName} on ${appointmentDate} at ${time} has been cancelled. Contact us to reschedule. - ${process.env.BUSINESS_NAME || "Nail Salon"}`;

  // Send notifications
  const emailResult = await sendEmail(email, emailSubject, emailText, emailHtml);
  
  let smsResult = { success: false, message: "No phone number" };
  if (phone) {
    smsResult = await sendSMS(phone, smsMessage);
  }

  return {
    email: emailResult,
    sms: smsResult,
  };
};

/* ---------------------------------------------
 * APPOINTMENT RESCHEDULED
 * --------------------------------------------- */
export const sendRescheduleNotification = async (appointment, client, oldDate, oldTime) => {
  const { date, time, serviceName } = appointment;
  const { fullName, email, phone } = client;

  const newDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const previousDate = new Date(oldDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Email content
  const emailSubject = "Appointment Rescheduled";
  const emailText = `
Hi ${fullName},

Your appointment has been rescheduled.

Previous Appointment:
Date: ${previousDate}
Time: ${oldTime}

New Appointment:
Service: ${serviceName}
Date: ${newDate}
Time: ${time}

We look forward to seeing you!

Best regards,
${process.env.BUSINESS_NAME || "Nail Salon"}
  `;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #d1ecf1; padding: 20px; text-align: center; border-radius: 5px; }
    .content { padding: 20px 0; }
    .appointment-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .old-details { background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; text-decoration: line-through; opacity: 0.7; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Appointment Rescheduled</h2>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>Your appointment has been rescheduled.</p>
      
      <div class="old-details">
        <p><strong>Previous Appointment:</strong></p>
        <p>Date: ${previousDate}</p>
        <p>Time: ${oldTime}</p>
      </div>

      <div class="appointment-details">
        <p><strong>New Appointment:</strong></p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date:</strong> ${newDate}</p>
        <p><strong>Time:</strong> ${time}</p>
      </div>
      
      <p>We look forward to seeing you!</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>${process.env.BUSINESS_NAME || "Nail Salon"}</p>
      ${process.env.CONTACT_PHONE ? `<p>Phone: ${process.env.CONTACT_PHONE}</p>` : ""}
    </div>
  </div>
</body>
</html>
  `;

  // SMS content
  const smsMessage = `${fullName}, your appointment has been rescheduled to ${newDate} at ${time}. See you then! - ${process.env.BUSINESS_NAME || "Nail Salon"}`;

  // Send notifications
  const emailResult = await sendEmail(email, emailSubject, emailText, emailHtml);
  
  let smsResult = { success: false, message: "No phone number" };
  if (phone) {
    smsResult = await sendSMS(phone, smsMessage);
  }

  return {
    email: emailResult,
    sms: smsResult,
  };
};