import Appointment from "../models/Appointment.js";
import Client from "../models/client.js";
import Service from "../models/service.js";
import Settings from "../models/Settings.js";
import {
  sendAppointmentConfirmation,
  sendCancellationNotification,
  sendRescheduleNotification,
} from "../services/notificationService.js";

/* ---------------------------------------------
 * Helper: Convert "HH:MM" → minutes
 * --------------------------------------------- */
const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/* ---------------------------------------------
 * Helper: Format minutes → "HH:MM"
 * --------------------------------------------- */
const toTimeString = (minutes) => {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
};

/* ---------------------------------------------
 * Helper: Calculate end time from start + duration
 * --------------------------------------------- */
const calculateEndTime = (startTime, durationMinutes) => {
  const startMinutes = toMinutes(startTime);
  return toTimeString(startMinutes + durationMinutes);
};

/* ---------------------------------------------
 * Helper: Check for overlapping appointments
 * --------------------------------------------- */
const hasConflict = async (date, startTime, endTime, excludeId = null) => {
  const query = {
    date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return Appointment.findOne(query);
};

/* ---------------------------------------------
 * Helper: Validate business hours
 * --------------------------------------------- */
const validateBusinessHours = async (date, startTime, endTime) => {
  const settings = await Settings.findOne();

  // defaults if no settings created yet
  const opening = settings?.openingTime || "09:00";
  const closing = settings?.closingTime || "18:00";

  const openMinutes = toMinutes(opening);
  const closeMinutes = toMinutes(closing);

  if (toMinutes(startTime) < openMinutes) return false;
  if (toMinutes(endTime) > closeMinutes) return false;

  return true;
};

/* ---------------------------------------------
 * GET Settings
 * --------------------------------------------- */
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        openingTime: "09:00",
        closingTime: "18:00",
      });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * UPDATE Settings
 * --------------------------------------------- */
export const updateSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });

    res.json({ message: "Settings updated", settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * CREATE Appointment
 * --------------------------------------------- */
export const createAppointment = async (req, res) => {
  try {
    const { clientId, serviceId, date, time, notes } = req.body;

    if (!clientId || !serviceId || !date || !time) {
      return res.status(400).json({
        message: "clientId, serviceId, date, and time are required",
      });
    }

    const client = await Client.findById(clientId);
    if (!client)
      return res.status(404).json({ message: "Client not found" });

    const service = await Service.findById(serviceId);
    if (!service)
      return res.status(404).json({ message: "Service not found" });

    const duration = service.duration;
    const startTime = time;
    const endTime = calculateEndTime(time, duration);

    const validHours = await validateBusinessHours(date, startTime, endTime);
    if (!validHours)
      return res
        .status(400)
        .json({ message: "Appointment outside business hours" });

    const conflict = await hasConflict(date, startTime, endTime);
    if (conflict)
      return res.status(409).json({
        message: "This time overlaps with another appointment",
      });

    const newAppointment = await Appointment.create({
      clientId,
      serviceId,
      serviceName: service.name,
      duration,
      date,
      time: startTime,
      startTime,
      endTime,
      notes: notes || "",
      status: "confirmed",
    });

    // Send confirmation notifications
    try {
      await sendAppointmentConfirmation(newAppointment, client);
    } catch (error) {
      console.error("Failed to send confirmation:", error.message);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      message: "Appointment created successfully",
      appointment: newAppointment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------------------------------------
 * GET Appointments by Date
 * --------------------------------------------- */
export const getAppointmentsForDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const appointments = await Appointment.find({ date })
      .populate("clientId")
      .populate("serviceId")
      .sort({ startTime: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * GET Available Slots
 * --------------------------------------------- */
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, serviceId } = req.query;

    if (!date || !serviceId) {
      return res.status(400).json({ message: "Date and serviceId are required" });
    }

    const service = await Service.findById(serviceId);
    if (!service)
      return res.status(404).json({ message: "Service not found" });

    const settings = await Settings.findOne();

    const opening = settings?.openingTime || "09:00";
    const closing = settings?.closingTime || "18:00";
    const interval = settings?.slotInterval || 30;

    const openMinutes = toMinutes(opening);
    const closeMinutes = toMinutes(closing);

    const existing = await Appointment.find({ date });

    let slots = [];

    for (let t = openMinutes; t + service.duration <= closeMinutes; t += interval) {
      const start = t;
      const end = t + service.duration;

      const startTime = toTimeString(start);
      const endTime = toTimeString(end);

      const conflict = existing.find(
        (a) => a.startTime < endTime && a.endTime > startTime
      );

      if (!conflict) slots.push(startTime);
    }

    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * CANCEL Appointment
 * --------------------------------------------- */
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate("clientId");
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    appointment.status = "cancelled";
    await appointment.save();

    // Send cancellation notification
    if (appointment.clientId) {
      try {
        await sendCancellationNotification(appointment, appointment.clientId);
      } catch (error) {
        console.error("Failed to send cancellation notification:", error.message);
      }
    }

    res.json({ message: "Appointment cancelled", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * GET All Appointments
 * --------------------------------------------- */
export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("clientId")
      .populate("serviceId")
      .sort({ date: 1, startTime: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * GET Single Appointment
 * --------------------------------------------- */
export const getSingleAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("clientId")
      .populate("serviceId");

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * UPDATE Appointment (reschedule, change service)
 * --------------------------------------------- */
export const updateAppointment = async (req, res) => {
  try {
    const { date, time, notes, serviceId } = req.body;

    const appointment = await Appointment.findById(req.params.id).populate("clientId");
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    // Store old values for notification
    const oldDate = appointment.date;
    const oldTime = appointment.time;
    const wasRescheduled = (date && date !== oldDate) || (time && time !== oldTime);

    let newDuration = appointment.duration;
    let newServiceName = appointment.serviceName;

    // If service changed → update duration & name
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (!service)
        return res.status(404).json({ message: "Service not found" });

      newDuration = service.duration;
      newServiceName = service.name;

      appointment.serviceId = serviceId;
      appointment.serviceName = newServiceName;
      appointment.duration = newDuration;
    }

    // If time/date changed → recalc conflict & business hours
    if (date !== undefined || time !== undefined) {
      const newDate = date ?? appointment.date;
      const newStart = time ?? appointment.time;

      const newEndTime = calculateEndTime(newStart, newDuration);

      // Check business hours
      const validHours = await validateBusinessHours(
        newDate,
        newStart,
        newEndTime
      );

      if (!validHours)
        return res
          .status(400)
          .json({ message: "Appointment outside business hours" });

      // Check conflicts
      const conflict = await hasConflict(
        newDate,
        newStart,
        newEndTime,
        appointment._id
      );

      if (conflict)
        return res.status(409).json({
          message: "This time overlaps with another appointment.",
        });

      // Apply updates
      appointment.date = newDate;
      appointment.time = newStart;
      appointment.startTime = newStart;
      appointment.endTime = newEndTime;
    }

    // Update notes if provided
    if (notes !== undefined) {
      appointment.notes = notes;
    }

    await appointment.save();

    // Send reschedule notification if date/time changed
    if (wasRescheduled && appointment.clientId) {
      try {
        await sendRescheduleNotification(
          appointment,
          appointment.clientId,
          oldDate,
          oldTime
        );
      } catch (error) {
        console.error("Failed to send reschedule notification:", error.message);
      }
    }

    res.json({ message: "Appointment updated", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * GET Appointments by Client (for logged-in user)
 * --------------------------------------------- */
export const getAppointmentsByClient = async (req, res) => {
  try {
    // If clientId is provided in params (admin viewing specific client)
    const clientId = req.params.clientId || req.user.id;
    
    // Non-admin users can only view their own appointments
    if (req.user.role !== "admin" && clientId !== req.user.id) {
      return res.status(403).json({ 
        message: "Access denied. You can only view your own appointments." 
      });
    }

    const appointments = await Appointment.find({
      clientId: clientId,
    })
      .populate("serviceId")
      .sort({ date: -1, startTime: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * UPDATE Appointment Status
 * --------------------------------------------- */
export const updateStatus = async (req, res) => {
  try {
    const allowed = [
      "pending",
      "confirmed",
      "completed",
      "cancelled",
      "no-show",
    ];

    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    if (!allowed.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Allowed: ${allowed.join(", ")}` 
      });
    }

    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Appointment not found" });

    res.json({ message: "Status updated", appointment: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------------------------------------
 * DELETE Appointment
 * --------------------------------------------- */
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Appointment.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ message: "Appointment not found" });

    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};