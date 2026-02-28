const express = require('express');
const supabase = require('../supabaseClient');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper to get appointment with all joined data
const getFullAppointment = async (id) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      house:houses(title, location, price, images),
      customer:users!appointment_customer_id_fkey(name, email, phone),
      landlord:users!appointment_landlord_id_fkey(name, email, phone)
    `)
    .eq('id', id)
    .single();
  return { data, error };
};

// Create appointment (customer only)
router.post('/', auth, async (req, res) => {
  try {
    const { houseId, appointmentDate, appointmentTime, message } = req.body;

    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can book appointments' });
    }

    // Check if house exists and get landlord_id
    const { data: house, error: houseError } = await supabase
      .from('houses')
      .select('landlord_id')
      .eq('id', houseId)
      .single();

    if (houseError || !house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert([{
        house_id: houseId,
        customer_id: req.user.id,
        landlord_id: house.landlord_id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        message: message || '',
        status: 'pending'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch with populated details
    const { data: fullAppointment } = await getFullAppointment(appointment.id);
    res.status(201).json(fullAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message, error: error.details });
  }
});

// Get customer's appointments
router.get('/customer/my-appointments', auth, async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        house:houses(title, location, price, images),
        landlord:users!appointment_landlord_id_fkey(name, email, phone)
      `)
      .eq('customer_id', req.user.id)
      .order('appointment_date', { ascending: false });

    if (error) throw error;
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message, error: error.details });
  }
});

// Get landlord's appointments
router.get('/landlord/my-appointments', auth, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        house:houses(title, location, price, images),
        customer:users!appointment_customer_id_fkey(name, email, phone)
      `)
      .eq('landlord_id', req.user.id)
      .order('appointment_date', { ascending: false });

    if (error) throw error;
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message, error: error.details });
  }
});

// Update appointment status (landlord only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    // Verify ownership and existence
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('landlord_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.landlord_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: updated } = await getFullAppointment(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message, error: error.details });
  }
});

// Cancel appointment (customer or landlord)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('customer_id, landlord_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !appointment) return res.status(404).json({ message: 'Appointment not found' });

    const isCustomer = appointment.customer_id === req.user.id;
    const isLandlord = appointment.landlord_id === req.user.id;

    if (!isCustomer && !isLandlord) return res.status(403).json({ message: 'Not authorized' });

    const { error: cancelError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id);

    if (cancelError) throw cancelError;

    const { data: updated } = await getFullAppointment(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message, error: error.details });
  }
});

// Get single appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: appointment, error } = await getFullAppointment(req.params.id);

    if (error || !appointment) return res.status(404).json({ message: 'Appointment not found' });

    const isCustomer = appointment.customer_id === req.user.id;
    const isLandlord = appointment.landlord_id === req.user.id;

    if (!isCustomer && !isLandlord) return res.status(403).json({ message: 'Not authorized' });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message, error: error.details });
  }
});

module.exports = router;