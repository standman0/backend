import express from "express";
import Client from "../models/client.js";

const router = express.Router();

// Get all clients
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single client by ID
router.get("/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new client
router.post("/", async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;

    // Validation
    if (!fullName || !email || !phone) {
      return res.status(400).json({ 
        message: "All fields are required (fullName, email, phone)" 
      });
    }

    // Check if client with email already exists
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(409).json({ 
        message: "Client with this email already exists" 
      });
    }

    const client = await Client.create({ fullName, email, phone });
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update client
router.put("/:id", async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Update fields
    if (fullName) client.fullName = fullName;
    if (email) client.email = email;
    if (phone) client.phone = phone;

    await client.save();
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete client
router.delete("/:id", async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;