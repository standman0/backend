import express from "express";
import {
  getDashboardOverview,
  getRevenueReport,
  getPopularServices,
  getTopClients,
  getBookingTrends,
  getPeakHours,
  getCancellationStats,
  getMonthlyComparison,
} from "../controllers/analyticsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// All analytics routes require admin authentication
router.use(authMiddleware, adminOnly);

// Dashboard overview - key metrics
router.get("/overview", getDashboardOverview);

// Revenue reports
router.get("/revenue", getRevenueReport);

// Popular services
router.get("/services/popular", getPopularServices);

// Top clients
router.get("/clients/top", getTopClients);

// Booking trends over time
router.get("/trends", getBookingTrends);

// Peak booking hours
router.get("/peak-hours", getPeakHours);

// Cancellation statistics
router.get("/cancellations", getCancellationStats);

// Monthly comparison
router.get("/monthly", getMonthlyComparison);

export default router;