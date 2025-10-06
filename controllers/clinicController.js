const Clinic = require('../models/Clinic');
const Organization = require('../models/Organization');

//create a new clinic
const createClinic = async (req, res) => {
  try {
    const { name, registrationNumber, type, address, contactEmail, contactPhone, location } = req.body;

    const { organizationId }  = req.user;  // ✅ take org from logged-in user

    console.log("Create Clinic Request Body:", req.body);

    if (!organizationId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    if (!name) {
      return res.status(400).json({ error: "Clinic name is required" });
    }

    // 🔹 generate a base prefix from the name (strip spaces, lowercase)
    const prefix = name.split(" ")[0].toLowerCase(); // e.g. "New Hope Life Scan" → "new"
    // Better: take first two words
    const base = name.replace(/\s+/g, "").toLowerCase(); // "New Hope Life Scan 1" → "newhopelifescan1"

    // 🔹 find existing clinics with same base prefix
    const existingClinics = await Clinic.find({ clinicId: new RegExp(`^${base}-`, "i") });
    const nextNumber = existingClinics.length + 1;

    const clinicId = `${base}-${nextNumber}`;

    const clinic = new Clinic({
      clinicId,
      organizationId,
      name,
      registrationNumber,
      type,
      address,
      contactEmail,
      contactPhone
    });

    await clinic.save();
    res.status(201).json(clinic);
  } catch (err) {
    console.error("Error creating clinic:", err);
    res.status(400).json({ error: err.message });
  }
};

// get all clinics (with scope)
const getClinics = async (req, res) => {
  try {
    const filter = req.scopeFilter || {}; 
    const clinics = await Clinic.find(filter);
    res.status(200).json(clinics);
  } catch (error) {
    console.error("Error fetching clinics:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get clinic by clinic id
const getClinicById = async (req, res) => {
  try {
    const clinic = await Clinic.findOne({ clinicId: req.params.id });
    if (!clinic) {
      return res.status(404).send();
    }
    res.status(200).send(clinic);
  } catch (error) {
    res.status(500).send(error);
  }
};

//edit a clinic
const editClinic = async (req, res) => {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    res.status(200).json(clinic);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//delete a clinic
const deleteClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const clinic = await Clinic.findByIdAndDelete(id);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }
    res.status(200).json({ message: "Clinic deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createClinic,
  getClinics,
  getClinicById,
  editClinic,
  deleteClinic
};