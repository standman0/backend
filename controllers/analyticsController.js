import Appointment from "../models/Appointment.js";
import Service from "../models/service.js";
import Client from "../models/client.js";

/* ---------------------------------------------
 * DASHBOARD OVERVIEW
 * Get key metrics for admin dashboard
 * --------------------------------------------- */
export const getDashboardOverview = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Total counts
    const totalAppointments = await Appointment.countDocuments();
    const totalClients = await Client.countDocuments();
    const totalServices = await Service.countDocuments();

    // Today's appointments
    const todayAppointments = await Appointment.countDocuments({ 
      date: today,
      status: { $ne: "cancelled" }
    });

    // This month's appointments
    const thisMonthAppointments = await Appointment.countDocuments({
      date: { $regex: `^${thisMonth}` },
      status: { $ne: "cancelled" }
    });

    // Pending appointments (upcoming)
    const pendingAppointments = await Appointment.countDocuments({
      date: { $gte: today },
      status: "pending"
    });

    // Completed appointments
    const completedAppointments = await Appointment.countDocuments({
      status: "completed"
    });

    // Calculate revenue (completed appointments only)
    const completedAppts = await Appointment.find({ 
      status: "completed" 
    }).populate("serviceId");

    const totalRevenue = completedAppts.reduce((sum, apt) => {
      return sum + (apt.serviceId?.price || 0);
    }, 0);

    // This month's revenue
    const thisMonthCompleted = await Appointment.find({
      date: { $regex: `^${thisMonth}` },
      status: "completed"
    }).populate("serviceId");

    const monthRevenue = thisMonthCompleted.reduce((sum, apt) => {
      return sum + (apt.serviceId?.price || 0);
    }, 0);

    res.json({
      overview: {
        totalAppointments,
        totalClients,
        totalServices,
        todayAppointments,
        thisMonthAppointments,
        pendingAppointments,
        completedAppointments,
      },
      revenue: {
        total: totalRevenue,
        thisMonth: monthRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * REVENUE REPORT
 * Get revenue broken down by time period
 * --------------------------------------------- */
export const getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = { status: "completed" };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate("serviceId")
      .sort({ date: 1 });

    // Calculate total revenue
    const totalRevenue = appointments.reduce((sum, apt) => {
      return sum + (apt.serviceId?.price || 0);
    }, 0);

    // Group by date for daily breakdown
    const dailyRevenue = {};
    appointments.forEach((apt) => {
      const date = apt.date;
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += apt.serviceId?.price || 0;
    });

    // Convert to array format
    const dailyBreakdown = Object.keys(dailyRevenue)
      .sort()
      .map((date) => ({
        date,
        revenue: dailyRevenue[date],
      }));

    res.json({
      period: {
        startDate: startDate || "All time",
        endDate: endDate || "Present",
      },
      totalRevenue,
      totalAppointments: appointments.length,
      averagePerAppointment: appointments.length > 0 
        ? (totalRevenue / appointments.length).toFixed(2) 
        : 0,
      dailyBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * POPULAR SERVICES
 * Get most booked services with stats
 * --------------------------------------------- */
export const getPopularServices = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get all completed and confirmed appointments
    const appointments = await Appointment.find({
      status: { $in: ["completed", "confirmed"] },
    }).populate("serviceId");

    // Count bookings per service
    const serviceCounts = {};
    const serviceRevenue = {};

    appointments.forEach((apt) => {
      const serviceId = apt.serviceId?._id?.toString();
      if (serviceId) {
        serviceCounts[serviceId] = (serviceCounts[serviceId] || 0) + 1;
        serviceRevenue[serviceId] = 
          (serviceRevenue[serviceId] || 0) + (apt.serviceId?.price || 0);
      }
    });

    // Get service details
    const services = await Service.find();

    // Build stats array
    const serviceStats = services
      .map((service) => {
        const id = service._id.toString();
        const bookings = serviceCounts[id] || 0;
        const revenue = serviceRevenue[id] || 0;

        return {
          service: {
            id: service._id,
            name: service.name,
            price: service.price,
            duration: service.duration,
          },
          bookings,
          revenue,
          averagePerBooking: bookings > 0 ? (revenue / bookings).toFixed(2) : 0,
        };
      })
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, parseInt(limit));

    res.json(serviceStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * TOP CLIENTS
 * Get clients with most bookings
 * --------------------------------------------- */
export const getTopClients = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get all appointments
    const appointments = await Appointment.find({
      status: { $in: ["completed", "confirmed"] },
    }).populate("clientId serviceId");

    // Count bookings and revenue per client
    const clientStats = {};

    appointments.forEach((apt) => {
      const clientId = apt.clientId?._id?.toString();
      if (clientId) {
        if (!clientStats[clientId]) {
          clientStats[clientId] = {
            client: apt.clientId,
            bookings: 0,
            totalSpent: 0,
          };
        }
        clientStats[clientId].bookings += 1;
        clientStats[clientId].totalSpent += apt.serviceId?.price || 0;
      }
    });

    // Convert to array and sort
    const topClients = Object.values(clientStats)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, parseInt(limit))
      .map((stat) => ({
        client: {
          id: stat.client._id,
          fullName: stat.client.fullName,
          email: stat.client.email,
          phone: stat.client.phone,
        },
        bookings: stat.bookings,
        totalSpent: stat.totalSpent,
        averagePerVisit: (stat.totalSpent / stat.bookings).toFixed(2),
      }));

    res.json(topClients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * BOOKING TRENDS
 * Get booking trends over time
 * --------------------------------------------- */
export const getBookingTrends = async (req, res) => {
  try {
    const { period = "month" } = req.query; // day, week, month, year

    const appointments = await Appointment.find({
      status: { $ne: "cancelled" },
    }).sort({ date: 1 });

    // Group by period
    const trends = {};

    appointments.forEach((apt) => {
      let key;
      const date = apt.date;

      switch (period) {
        case "day":
          key = date; // YYYY-MM-DD
          break;
        case "week":
          // Group by week (first day of week)
          const d = new Date(date);
          const dayOfWeek = d.getDay();
          const diff = d.getDate() - dayOfWeek;
          const weekStart = new Date(d.setDate(diff));
          key = weekStart.toISOString().split("T")[0];
          break;
        case "month":
          key = date.slice(0, 7); // YYYY-MM
          break;
        case "year":
          key = date.slice(0, 4); // YYYY
          break;
        default:
          key = date.slice(0, 7);
      }

      if (!trends[key]) {
        trends[key] = {
          period: key,
          bookings: 0,
          confirmed: 0,
          completed: 0,
          pending: 0,
          noShow: 0,
        };
      }

      trends[key].bookings += 1;
      trends[key][apt.status] = (trends[key][apt.status] || 0) + 1;
    });

    // Convert to array and sort
    const trendData = Object.values(trends).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    res.json({
      period,
      data: trendData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * PEAK HOURS
 * Get most popular booking times
 * --------------------------------------------- */
export const getPeakHours = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      status: { $in: ["completed", "confirmed"] },
    });

    // Count bookings per hour
    const hourCounts = {};

    appointments.forEach((apt) => {
      const hour = apt.time.split(":")[0]; // Get hour from "HH:MM"
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Convert to array and sort by count
    const peakHours = Object.keys(hourCounts)
      .map((hour) => ({
        hour: `${hour}:00`,
        bookings: hourCounts[hour],
      }))
      .sort((a, b) => b.bookings - a.bookings);

    res.json(peakHours);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * CANCELLATION RATE
 * Get cancellation statistics
 * --------------------------------------------- */
export const getCancellationStats = async (req, res) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const cancelledAppointments = await Appointment.countDocuments({
      status: "cancelled",
    });
    const noShowAppointments = await Appointment.countDocuments({
      status: "no-show",
    });

    const cancellationRate =
      totalAppointments > 0
        ? ((cancelledAppointments / totalAppointments) * 100).toFixed(2)
        : 0;

    const noShowRate =
      totalAppointments > 0
        ? ((noShowAppointments / totalAppointments) * 100).toFixed(2)
        : 0;

    res.json({
      total: totalAppointments,
      cancelled: cancelledAppointments,
      noShow: noShowAppointments,
      completed: await Appointment.countDocuments({ status: "completed" }),
      confirmed: await Appointment.countDocuments({ status: "confirmed" }),
      cancellationRate: `${cancellationRate}%`,
      noShowRate: `${noShowRate}%`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------
 * MONTHLY COMPARISON
 * Compare current month with previous months
 * --------------------------------------------- */
export const getMonthlyComparison = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const monthlyData = [];
    const today = new Date();

    for (let i = 0; i < parseInt(months); i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearMonth = date.toISOString().slice(0, 7); // YYYY-MM

      const appointments = await Appointment.find({
        date: { $regex: `^${yearMonth}` },
        status: { $ne: "cancelled" },
      }).populate("serviceId");

      const revenue = appointments
        .filter((apt) => apt.status === "completed")
        .reduce((sum, apt) => sum + (apt.serviceId?.price || 0), 0);

      monthlyData.unshift({
        month: yearMonth,
        bookings: appointments.length,
        revenue,
        averagePerBooking:
          appointments.length > 0
            ? (revenue / appointments.length).toFixed(2)
            : 0,
      });
    }

    res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};