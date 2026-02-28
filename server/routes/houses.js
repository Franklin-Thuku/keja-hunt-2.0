const express = require('express');
const House = require('../models/House');
const { auth, isLandlord } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// Get all houses with filters
router.get('/', async (req, res) => {
  try {
    const {
      location,
      city,
      state,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      propertyType,
      available,
      search
    } = req.query;

    // Build filter object
    const filter = {};

    if (available !== undefined) {
      filter.available = available === 'true';
    } else {
      filter.available = true; // Default to show only available houses
    }

    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }

    if (state) {
      filter['location.state'] = new RegExp(state, 'i');
    }

    if (location) {
      filter.$or = [
        { 'location.address': new RegExp(location, 'i') },
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (minBedrooms || maxBedrooms) {
      filter.bedrooms = {};
      if (minBedrooms) filter.bedrooms.$gte = Number(minBedrooms);
      if (maxBedrooms) filter.bedrooms.$lte = Number(maxBedrooms);
    }

    if (propertyType) {
      filter.propertyType = propertyType;
    }

    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.address': new RegExp(search, 'i') },
        { 'location.city': new RegExp(search, 'i') }
      ];
    }

    const houses = await House.find(filter)
      .populate('landlord', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single house
router.get('/:id', async (req, res) => {
  try {
    const house = await House.findById(req.params.id)
      .populate('landlord', 'name email phone');
    
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    res.json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create house (landlord only)
router.post('/', auth, isLandlord, async (req, res) => {
  try {
    const houseData = {
      ...req.body,
      landlord: req.user._id
    };

    const house = new House(houseData);
    await house.save();
    await house.populate('landlord', 'name email phone');

    res.status(201).json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update house (landlord only, own houses)
router.put('/:id', auth, isLandlord, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // Check if user owns this house
    if (house.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this house' });
    }

    Object.assign(house, req.body);
    await house.save();
    await house.populate('landlord', 'name email phone');

    res.json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete house (landlord only, own houses)
router.delete('/:id', auth, isLandlord, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // Check if user owns this house
    if (house.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this house' });
    }

    await house.deleteOne();
    res.json({ message: 'House deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get landlord's houses
router.get('/landlord/my-houses', auth, isLandlord, async (req, res) => {
  try {
    const houses = await House.find({ landlord: req.user._id })
      .populate('landlord', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload images for a house (landlord only)
router.post('/:id/images', auth, isLandlord, upload.array('images', 10), async (req, res) => {
  try {
    const house = await House.findById(req.params.id);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // Check if user owns this house
    if (house.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to upload images for this house' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    // Add image paths to house
    const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
    house.images = [...(house.images || []), ...imagePaths];
    await house.save();

    res.json({ images: house.images });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an image from a house (landlord only)
router.delete('/:id/images/:imageIndex', auth, isLandlord, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // Check if user owns this house
    if (house.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    if (imageIndex < 0 || imageIndex >= house.images.length) {
      return res.status(400).json({ message: 'Invalid image index' });
    }

    // Remove image from array
    house.images.splice(imageIndex, 1);
    await house.save();

    res.json({ images: house.images });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

