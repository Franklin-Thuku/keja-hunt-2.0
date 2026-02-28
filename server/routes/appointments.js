const express = require('express');
const Appointment = require('../models/Appointment');
const House = require('../models/House');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create appointment (customer only)
router.post('/', auth, async (req, res) => {
  try {
    const { houseId, appointmentDate, appointmentTime, message } = req.body;

    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can book appointments' });
    }

    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const appointment = new Appointment({
      house: houseId,
      customer: req.user._id,
      landlord: house.landlord,
      appointmentDate,
      appointmentTime,
      message: message || ''
    });

    await appointment.save();
    await appointment.populate('house', 'title location');
    await appointment.populate('customer', 'name email phone');
    await appointment.populate('landlord', 'name email phone');

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get customer's appointments
router.get('/customer/my-appointments', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.user._id })
      .populate('house', 'title location price images')
      .populate('landlord', 'name email phone')
      .sort({ appointmentDate: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get landlord's appointments
router.get('/landlord/my-appointments', auth, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const appointments = await Appointment.find({ landlord: req.user._id })
      .populate('house', 'title location price images')
      .populate('customer', 'name email phone')
      .sort({ appointmentDate: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status (landlord only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only landlord can update status
    if (appointment.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    appointment.status = status;
    await appointment.save();
    await appointment.populate('house', 'title location');
    await appointment.populate('customer', 'name email phone');
    await appointment.populate('landlord', 'name email phone');

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel appointment (customer or landlord)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is the customer or landlord
    const isCustomer = appointment.customer.toString() === req.user._id.toString();
    const isLandlord = appointment.landlord.toString() === req.user._id.toString();

    if (!isCustomer && !isLandlord) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    appointment.status = 'cancelled';
    await appointment.save();
    await appointment.populate('house', 'title location');
    await appointment.populate('customer', 'name email phone');
    await appointment.populate('landlord', 'name email phone');

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('house', 'title location price images')
      .populate('customer', 'name email phone')
      .populate('landlord', 'name email phone');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is authorized to view this appointment
    const isCustomer = appointment.customer._id.toString() === req.user._id.toString();
    const isLandlord = appointment.landlord._id.toString() === req.user._id.toString();

    if (!isCustomer && !isLandlord) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

