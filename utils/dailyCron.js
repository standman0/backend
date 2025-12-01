import cron from "node-cron";
import Appointment from "../models/Appointment.js";
import Client from "../models/client.js";
import sendEmail from "./sendEmail.js";

cron.schedule("0 7 * * *", async () => {
  const today = new Date().toISOString().split("T")[0];

  const appointments = await Appointment.find({ date: today });

  for (let appt of appointments) {
    const client = await Client.findById(appt.clientId);

    if (client) {
      await sendEmail(
        client.email,
        "Your Appointment Today",
        `Reminder: You have an appointment today at ${appt.time} for ${appt.service}.`
      );
    }
  }

  console.log("Daily reminder emails sent!");
});
