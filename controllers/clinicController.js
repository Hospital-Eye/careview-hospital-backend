const Clinic = require('../models/Clinic');

//create a new clinic
const createClinic = async (req, res) => {
  try {
    const clinic = new Clinic(req.body);
    await clinic.save();
    res.status(201).send(clinic);
  } catch (error) {
    res.status(400).send(error);
  }
};

//get all clinics
const getClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find();
    res.status(200).send(clinics);
  } catch (error) {
    res.status(500).send(error);
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