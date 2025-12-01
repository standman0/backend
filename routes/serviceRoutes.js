import express from "express";
import Service from "../models/service.js";

const router = express.Router();

// Get all services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single service by ID
router.get("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new service
router.post("/", async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;

    // Validation
    if (!name || !price || !duration) {
      return res.status(400).json({ 
        message: "Required fields: name, price, duration" 
      });
    }

    if (price <= 0) {
      return res.status(400).json({ 
        message: "Price must be greater than 0" 
      });
    }

    if (duration <= 0) {
      return res.status(400).json({ 
        message: "Duration must be greater than 0" 
      });
    }

    const service = await Service.create({ 
      name, 
      price, 
      duration, 
      description 
    });
    
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update service
router.put("/:id", async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Update fields
    if (name) service.name = name;
    if (price) service.price = price;
    if (duration) service.duration = duration;
    if (description !== undefined) service.description = description;

    await service.save();
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete service
router.delete("/:id", async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;