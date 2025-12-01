import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export default async function sendEmail(to, subject, message) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"GlamNails" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: message,
  });

  console.log("Email sent to:", to);
}
