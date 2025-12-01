import Client from "../models/client.js";

export const createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
