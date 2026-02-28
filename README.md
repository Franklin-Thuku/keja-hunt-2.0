# Keja Hunt 2.0 - House Hunting Platform

A full-stack web application that connects people looking to relocate with landlords who have vacant houses. Customers can search and filter houses by location, price range, and other criteria, while landlords can upload and manage their house listings.

## Features

### For Customers
- Browse available houses with images
- Advanced filtering by:
  - Location (city, state, address)
  - Price range (min/max)
  - Number of bedrooms/bathrooms
  - Property type (apartment, house, condo, studio, townhouse)
  - Search by keywords
- View detailed house information with image gallery
- Interactive map showing exact house location
- Contact landlord via WhatsApp or phone call
- Book viewing appointments
- Manage appointments

### For Landlords
- Register as a landlord
- Upload multiple images for each house listing
- Upload new house listings
- Edit existing listings
- Delete listings
- Manage all listings from dashboard
- View listing status (available/not available)
- Manage appointment requests (confirm/cancel/complete)

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT authentication
- RESTful API

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- Google Maps API integration
- Image upload and gallery
- Modern, responsive UI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd "keja hunt 2.0"
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```
   Or install separately:
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/kejahunt
   JWT_SECRET=your-secret-key-change-this-in-production
   ```
   
   For MongoDB Atlas (cloud), use:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kejahunt
   ```
   
   Create a `.env` file in the `client` directory (optional, for Google Maps):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```
   
   **Note:** To get a Google Maps API key:
   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project or select an existing one
   3. Enable the Maps JavaScript API
   4. Create credentials (API Key)
   5. Add the API key to your `.env` file

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system. If using MongoDB locally:
   ```bash
   mongod
   ```
   
   Or use MongoDB Atlas (cloud) - no local installation needed.

## Running the Application

### Development Mode (Both Server and Client)

From the root directory:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Run Separately

**Backend only:**
```bash
cd server
npm run dev
```

**Frontend only:**
```bash
cd client
npm start
```

## Usage

1. **Register an Account**
   - Go to `/register`
   - Choose your role: Customer (looking for a house) or Landlord (want to list houses)
   - Fill in your details and create an account

2. **For Customers:**
   - Browse houses on the home page
   - Use filters to find houses matching your criteria
   - Click on a house card to view detailed information
   - Contact the landlord using provided contact information

3. **For Landlords:**
   - After logging in, go to "My Dashboard"
   - Click "Add New House" to create a listing
   - Fill in all property details
   - Upload images for the house (multiple images supported)
   - Edit or delete listings from your dashboard
   - View and manage appointment requests in "My Appointments"
   - Confirm, cancel, or mark appointments as completed

4. **For Customers:**
   - Browse houses and use filters to find your perfect home
   - Click on a house to view details, images, and location on map
   - Contact landlord via WhatsApp or phone call
   - Book viewing appointments directly from house detail page
   - Manage your appointments in "My Appointments"

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Houses
- `GET /api/houses` - Get all houses (with optional filters)
- `GET /api/houses/:id` - Get single house
- `POST /api/houses` - Create house (landlord only)
- `PUT /api/houses/:id` - Update house (landlord only, own houses)
- `DELETE /api/houses/:id` - Delete house (landlord only, own houses)
- `GET /api/houses/landlord/my-houses` - Get landlord's houses (landlord only)
- `POST /api/houses/:id/images` - Upload images for a house (landlord only)
- `DELETE /api/houses/:id/images/:imageIndex` - Delete an image (landlord only)

### Appointments
- `POST /api/appointments` - Create appointment (customer only)
- `GET /api/appointments/customer/my-appointments` - Get customer's appointments
- `GET /api/appointments/landlord/my-appointments` - Get landlord's appointments
- `PUT /api/appointments/:id/status` - Update appointment status (landlord only)
- `PUT /api/appointments/:id/cancel` - Cancel appointment (customer or landlord)
- `GET /api/appointments/:id` - Get single appointment

### Users
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

## Project Structure

```
keja-hunt-2.0/
├── server/
│   ├── models/
│   │   ├── User.js
│   │   └── House.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── houses.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   ├── index.js
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js
│   │   ├── components/
│   │   │   └── Navbar.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── HouseDetail.js
│   │   │   ├── LandlordDashboard.js
│   │   │   ├── AddHouse.js
│   │   │   ├── EditHouse.js
│   │   │   └── Profile.js
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
└── package.json
```

## New Features Added

✅ **Image Upload**: Landlords can upload multiple images for each house listing
✅ **Interactive Maps**: Google Maps integration showing exact house locations
✅ **WhatsApp Integration**: Direct WhatsApp contact with landlords
✅ **Appointment Scheduling**: Customers can book viewing appointments, landlords can manage them

## Future Enhancements

- Geocoding to automatically get coordinates from addresses
- Email notifications for appointments
- Favorites/Wishlist feature for customers
- Reviews and ratings
- Payment integration
- Admin dashboard
- Advanced analytics
- Image compression and optimization

## License

MIT

## Support

For issues or questions, please create an issue in the repository.

