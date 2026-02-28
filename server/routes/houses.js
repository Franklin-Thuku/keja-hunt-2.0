const express = require('express');
const supabase = require('../supabaseClient');
const { auth, isLandlord } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// 1. GET ALL HOUSES
router.get('/', async (req, res) => {
  try {
    const { city, propertyType, available } = req.query;
    let query = supabase.from('houses').select('*, users!houses_landlord_id_fkey(name, email, phone)');

    if (available !== undefined) query = query.eq('available', available !== 'false');
    if (city) query = query.ilike('city', `%${city}%`);
    if (propertyType) query = query.eq('property_type', propertyType);

    const { data: houses, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const formattedHouses = houses.map(h => ({
      ...h,
      location: { city: h.city, address: h.address, state: h.state }
    }));
    res.json(formattedHouses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET LANDLORD HOUSES (CRITICAL FIX)
router.get('/landlord/my-houses', auth, isLandlord, async (req, res) => {
  try {
    const { data: houses, error } = await supabase
      .from('houses')
      .select('*')
      .eq('landlord_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = houses.map(h => ({
      ...h,
      location: { city: h.city, address: h.address, state: h.state }
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. GET SINGLE HOUSE
router.get('/:id', async (req, res) => {
  try {
    const { data: house, error } = await supabase
      .from('houses')
      .select('*, users!houses_landlord_id_fkey(name, email, phone)')
      .eq('id', req.params.id)
      .single();

    if (error || !house) return res.status(404).json({ message: 'House not found' });

    res.json({
      ...house,
      location: { city: house.city, address: house.address, state: house.state }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. POST NEW HOUSE
router.post('/', auth, isLandlord, async (req, res) => {
  try {
    const { title, price, location, propertyType } = req.body;
    const houseData = {
      title,
      price: Number(price),
      city: location?.city,
      address: location?.address,
      state: location?.state,
      property_type: propertyType,
      landlord_id: req.user.id
    };

    const { data, error } = await supabase.from('houses').insert([houseData]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. UPLOAD IMAGES
router.post('/:id/images', auth, isLandlord, upload.array('images', 10), async (req, res) => {
  try {
    const { data: house, error: fetchError } = await supabase.from('houses').select('images, landlord_id').eq('id', req.params.id).single();
    if (fetchError || house.landlord_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    const uploadedUrls = [];
    for (const file of req.files) {
      const filePath = `house-${req.params.id}/${Date.now()}-${file.originalname}`;
      const { error: uploadError } = await supabase.storage.from('house-images').upload(filePath, file.buffer, { contentType: file.mimetype });
      if (uploadError) throw uploadError;
      uploadedUrls.push(supabase.storage.from('house-images').getPublicUrl(filePath).data.publicUrl);
    }

    const { data: updated, error: updateError } = await supabase.from('houses').update({ images: [...(house.images || []), ...uploadedUrls] }).eq('id', req.params.id).select().single();
    if (updateError) throw updateError;
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;