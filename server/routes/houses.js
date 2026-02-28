const express = require('express');
const supabase = require('../supabaseClient');
const { auth, isLandlord } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * @route   GET /api/houses
 * @desc    Get all houses with filters
 */
router.get('/', async (req, res) => {
  try {
    const { location, city, state, minPrice, maxPrice, minBedrooms, propertyType, available, search } = req.query;

    let query = supabase
      .from('houses')
      .select('*, users!houses_landlord_id_fkey(name, email, phone)')
      .order('created_at', { ascending: false });

    // Filter logic
    if (available !== undefined) query = query.eq('available', available !== 'false');
    if (city) query = query.ilike('city', `%${city}%`);
    if (state) query = query.ilike('state', `%${state}%`);
    if (propertyType) query = query.eq('property_type', propertyType);
    if (minPrice) query = query.gte('price', Number(minPrice));
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (minBedrooms) query = query.gte('bedrooms', Number(minBedrooms));

    if (location) {
      query = query.or(`address.ilike.%${location}%,city.ilike.%${location}%,state.ilike.%${location}%`);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data: houses, error } = await query;
    if (error) throw error;

    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/houses
 * @desc    Create a new house listing
 */
router.post('/', auth, isLandlord, async (req, res) => {
  try {
    const { 
      title, description, price, bedrooms, bathrooms, 
      area, propertyType, location, amenities, available 
    } = req.body;

    // Map the nested frontend data to flat database columns
    const houseData = {
      title,
      description,
      price: Number(price),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      area: Number(area),
      property_type: propertyType, // Maps 'propertyType' to 'property_type'
      address: location?.address,  // Flattens location object
      city: location?.city,        
      state: location?.state,      
      amenities: Array.isArray(amenities) ? amenities : [],
      available: available ?? true,
      landlord_id: req.user.id
    };

    const { data: house, error } = await supabase
      .from('houses')
      .insert([houseData])
      .select('*, users!houses_landlord_id_fkey(name, email, phone)')
      .single();

    if (error) throw error;
    res.status(201).json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/houses/:id
 * @desc    Update house details (Landlord only)
 */
router.put('/:id', auth, isLandlord, async (req, res) => {
  try {
    // 1. Verify ownership
    const { data: house, error: fetchError } = await supabase
      .from('houses')
      .select('landlord_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !house) return res.status(404).json({ message: 'House not found' });
    if (house.landlord_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    // 2. Perform update with sanitized data
    const { data: updatedHouse, error: updateError } = await supabase
      .from('houses')
      .update(req.body)
      .eq('id', req.params.id)
      .select('*, users!houses_landlord_id_fkey(name, email, phone)')
      .single();

    if (updateError) throw updateError;
    res.json(updatedHouse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/houses/:id/images
 * @desc    Upload images to Supabase Storage
 */
router.post('/:id/images', auth, isLandlord, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No images uploaded' });

    const { data: house, error: fetchError } = await supabase
      .from('houses')
      .select('landlord_id, images')
      .eq('id', req.params.id)
      .single();

    if (fetchError || house.landlord_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    const uploadedUrls = [];
    for (const file of req.files) {
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = `house-${req.params.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('house-images')
        .upload(filePath, file.buffer, { contentType: file.mimetype });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('house-images').getPublicUrl(filePath);
      uploadedUrls.push(publicUrlData.publicUrl);
    }

    const updatedImages = [...(house.images || []), ...uploadedUrls];
    const { data: finalHouse, error: updateError } = await supabase
      .from('houses')
      .update({ images: updatedImages })
      .eq('id', req.params.id)
      .select('images')
      .single();

    if (updateError) throw updateError;
    res.json({ images: finalHouse.images });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export the router
module.exports = router;