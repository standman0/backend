import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    openingTime: {
      type: String,
      default: "09:00",
      required: true,
    },
    closingTime: {
      type: String,
      default: "18:00",
      required: true,
    },
    slotInterval: {
      type: Number, // minutes between slots
      default: 30,
    },
    bufferTime: {
      type: Number, // minutes buffer between appointments
      default: 0,
    },
    maxAdvanceBookingDays: {
      type: Number,
      default: 60, // how far ahead clients can book
    },
    businessName: {
      type: String,
      default: "Nail Salon",
    },
    contactEmail: {
      type: String,
      default: "",
    },
    contactPhone: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);