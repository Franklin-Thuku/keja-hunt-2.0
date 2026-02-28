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
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No images uploaded' });

    // 1. Log the attempt
    console.log(`Uploading images for house: ${req.params.id}`);

    const uploadedUrls = [];
    for (const file of req.files) {
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = `house-${req.params.id}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('house-images')
        .upload(filePath, file.buffer, { 
          contentType: file.mimetype,
          upsert: true // This prevents "Already exists" errors
        });

      if (uploadError) {
        console.error("SUPABASE UPLOAD ERROR:", uploadError); // LOOK FOR THIS IN TERMINAL
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('house-images').getPublicUrl(filePath);
      uploadedUrls.push(publicUrlData.publicUrl);
    }

    // 2. Update the database with new image URLs
    const { data: house, error: fetchError } = await supabase
      .from('houses')
      .select('images')
      .eq('id', req.params.id)
      .single();

    const updatedImages = [...(house?.images || []), ...uploadedUrls];

    const { error: updateError } = await supabase
      .from('houses')
      .update({ images: updatedImages })
      .eq('id', req.params.id);

    if (updateError) {
      console.error("DATABASE UPDATE ERROR:", updateError);
      throw updateError;
    }

    res.json({ images: updatedImages });
  } catch (error) {
    console.error("FINAL CATCH ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
});


/**
 * @route   DELETE /api/houses/:id
 * @desc    Delete a house listing (Landlord only)
 */
router.delete('/:id', auth, isLandlord, async (req, res) => {
  try {
    // 1. First, check if the house exists and belongs to this landlord
    const { data: house, error: fetchError } = await supabase
      .from('houses')
      .select('landlord_id, images')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !house) {
      return res.status(404).json({ message: 'House not found' });
    }

    if (house.landlord_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own listings' });
    }

    // 2. Optional: Delete associated images from Supabase Storage first
    if (house.images && house.images.length > 0) {
      for (const imageUrl of house.images) {
        // Extract the file path from the public URL
        const filePath = imageUrl.split('/house-images/')[1];
        if (filePath) {
          await supabase.storage.from('house-images').remove([filePath]);
        }
      }
    }

    // 3. Delete the record from the database
    const { error: deleteError } = await supabase
      .from('houses')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;