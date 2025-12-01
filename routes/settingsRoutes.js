import express from "express";
import { getSettings, updateSettings } from "../controllers/appointmentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// PUBLIC ROUTE - Anyone can view business hours/settings
router.get("/", getSettings);

// ADMIN ONLY - Only admins can update settings
router.put("/", authMiddleware, adminOnly, updateSettings);

export default router;