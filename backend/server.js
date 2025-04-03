// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// TODO: FOR LOCAL
// app.use(cors({ origin: 'http://localhost:4200', credentials: true }));

// FOR GCP
const allowedOrigins = [
  'http://localhost:4200', // Local dev
  'https://web-tech-hw3-frontend.wl.r.appspot.com', // Frontend URL
  'https://web-tech-hw3-455523.wl.r.appspot.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps or curl) or if origin is in allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true // If you're using cookies or JWT in cookies
}));

app.use(express.json());
app.use(cookieParser());

const CONFIG = {
  client_id: "c14f8875c6a729db3325",
  client_secret: "4fd0be8dd338cfa2588a4af9644b244a"
};

// Function to get authentication token
async function getAuthToken(client_id, client_secret) {
  const url = "https://api.artsy.net/api/tokens/xapp_token";

  try {
    const response = await axios.post(url, {
      client_id: client_id,
      client_secret: client_secret
    });

    if (response.data) {
      const { token, expires_at } = response.data;
      // console.log('Token:', token);
      console.log('Expires At:', expires_at);
      return { token, expires_at };
    }
  } catch (error) {
    console.error('Error fetching the token:', error);
    return null;
  }
}

app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from the Node.js/Express backend!' });
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Mongo URI:", process.env.MONGO_URI);
    console.log('MongoDB connected:', conn.connection.host);
    console.log('Database in use:', conn.connection.db.databaseName);
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
};
connectDB();

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImageUrl: { type: String },
});
const User = mongoose.model('User', userSchema);

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artistId: { type: String, required: true },
}, { collection: 'HW3.users' });
const Favorite = mongoose.model('Favorite', favoriteSchema);

console.log('User collection name:', User.collection.collectionName);
console.log('Favorite collection name:', Favorite.collection.collectionName);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // { id, email }
    next();
  });
};

// Dynamic /api/auth-status endpoint
app.get('/api/auth-status', async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // Fetch user from MongoDB
    const user = await User.findById(userId).select('-password'); // Exclude password
    if (!user) {
      res.clearCookie('token'); // Clear invalid token
      return res.status(401).json({ message: 'User not found' });
    }

    // Respond with user data
    res.json({
      message: 'User authenticated',
      user: {
        fullname: user.fullname,
        email: user.email,
        profileImageUrl: user.profileImageUrl
      }
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.clearCookie('token'); // Clear invalid/expired token
    res.status(403).json({ message: 'Invalid or expired token' });
  }
});

// Registration Endpoint
app.get('/api/register', async (req, res) => {
  const { fullname, email, password } = req.query;
  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profileImageUrl = `https://www.gravatar.com/avatar/${require('crypto').createHash('sha256').update(email.trim().toLowerCase()).digest('hex')}?d=identicon`;

    const user = new User({ fullname, email, password: hashedPassword, profileImageUrl });
    await user.save();
    console.log(`User saved to ${User.collection.collectionName}:`, { email, fullname });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 3600000 });
    res.json({ message: 'Registration successful', user: { fullname, email, profileImageUrl } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login Endpoint
app.get('/api/login', async (req, res) => {
  const { email, password } = req.query;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 3600000 });
    res.json({ message: 'Login successful', user: { fullname: user.fullname, email, profileImageUrl: user.profileImageUrl } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout Endpoint
app.get('/api/logout', (req, res) => { // Removed authenticateToken to match frontend
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Delete Account Endpoint
app.get('/api/delete-account', authenticateToken, async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user.id });
    await Favorite.deleteMany({ userId: req.user.id });
    console.log(`Deleted user from ${User.collection.collectionName} and favorites from ${Favorite.collection.collectionName} for userId: ${req.user.id}`);
    res.clearCookie('token');
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});


// Add Preference
app.get('/api/add-preference', authenticateToken, async (req, res) => {
  const { artistId } = req.query;
  if (!artistId) {
    return res.status(400).json({ error: 'Artist ID is required' });
  }

  try {
    const existingFavorite = await Favorite.findOne({ userId: req.user.id, artistId });
    if (!existingFavorite) {
      const favorite = new Favorite({ userId: req.user.id, artistId });
      await favorite.save();
      console.log(`Added favorite to ${Favorite.collection.collectionName}:`, { userId: req.user.id, artistId });
    }
    const favorites = await Favorite.find({ userId: req.user.id }).select('artistId -_id');
    res.json({ message: 'Preference added', preferences: favorites.map(f => f.artistId) });
  } catch (error) {
    console.error('Error adding preference:', error);
    res.status(500).json({ error: 'Failed to add preference' });
  }
});

// Remove Preference
app.get('/api/remove-preference', authenticateToken, async (req, res) => {
  const { artistId } = req.query;
  if (!artistId) {
    return res.status(400).json({ error: 'Artist ID is required' });
  }

  try {
    const result = await Favorite.deleteOne({ userId: req.user.id, artistId });
    if (result.deletedCount > 0) {
      console.log(`Removed favorite from ${Favorite.collection.collectionName}:`, { userId: req.user.id, artistId });
    }
    const favorites = await Favorite.find({ userId: req.user.id }).select('artistId -_id');
    res.json({ message: 'Preference removed', preferences: favorites.map(f => f.artistId) });
  } catch (error) {
    console.error('Error removing preference:', error);
    res.status(500).json({ error: 'Failed to remove preference' });
  }
});

// Get User Preferences
app.get('/api/preferences', authenticateToken, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).select('artistId -_id');
    console.log(`Fetched favorites from ${Favorite.collection.collectionName} for user ${req.user.id}:`, favorites.map(f => f.artistId));
    res.json({ preferences: favorites.map(f => f.artistId) });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User authenticated', user: { fullname: user.fullname, email: user.email, profileImageUrl: user.profileImageUrl } });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

async function getArtists(query, token) {

  // console.log("token:", token);
  // Replace spaces with '+'
  if (query.includes(' ')) {
    query = query.replace(/ /g, '+');
  }

  const url = "https://api.artsy.net/api/search";
  const headers = {
    "X-XAPP-Token": token
  };
  const params = {
    q: query,
    size: 10,
    type: "artist"
  };

  try {
    // Send the GET request to Artsy API
    const response = await axios.get(url, { headers, params });
    console.log("Artsy API Response:", response.data);

    // If the response is not successful, throw an error
    if (response.status !== 200) {
      throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }

    const data = response.data;
    const artists = [];

    // Extract artists from the response
    const results = data._embedded?.results || [];
    for (let result of results) {
      const artist_name = result.title || "Unknown Artist";
      let artist_image = result._links?.thumbnail?.href || "";
      const artist_id = result._links?.self?.href?.split("/").pop();

      // Check if the artist image is missing and set it to null
      if (artist_image.includes("missing_image.png")) {
        artist_image = null;
      }

      artists.push({
        artist_name,
        artist_id,
        artist_image
      });
    }

    return artists;
  } catch (error) {
    console.error("Error fetching artists:", error);
    return []; // Return an empty array if there's an error
  }
}

// Define the /api/search route
app.get('/api/search', async (req, res) => {
  const query = req.query.q; // Get the artist name from the query parameter

  if (!query) {
    return res.status(400).json({ error: "Artist name is required." });
  }

  try {
    // Get the authentication token
    const { token } = await getAuthToken(CONFIG.client_id, CONFIG.client_secret);

    if (token) {
      // Get the artists using the token and artist query
      const artists = await getArtists(query, token);
      return res.json(artists); // Send the artists as the response
    } else {
      return res.status(500).json({ error: "Failed to get authentication token." });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching artists." });
  }
});

async function getArtistDetails(artistId, token) {
  const url = `https://api.artsy.net/api/artists/${artistId}`;
  const headers = { "X-XAPP-Token": token };

  try {
    const response = await axios.get(url, { headers });
    console.log("Artist API Response:", response.data); // Debug: Check response

    return {
      name: response.data.name || 'Unknown',
      birthday: response.data.birthday || 'Unknown',
      deathday: response.data.deathday || 'Unknown',
      nationality: response.data.nationality || 'Unknown',
      biography: response.data.biography || ''
    };
  } catch (error) {
    console.error("Error fetching artist details:", error.response?.data || error.message);
    throw new Error(`Error: ${error.response ? error.response.status : 'Unknown'}, ${error.message}`);
  }
}

app.get('/api/artists/:artistId', async (req, res) => {
  const artistId = req.params.artistId;

  try {
    // Get the authentication token
    const authData = await getAuthToken(CONFIG.client_id, CONFIG.client_secret);

    if (!authData || !authData.token) {
      return res.status(500).json({ error: 'Failed to get authentication token.' });
    }

    const { token } = authData;

    // Get the artist details using the token and artistId
    const details = await getArtistDetails(artistId, token);
    return res.json(details); // Send the artist details as the response
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

async function getSimilarArtists(artistId, token) {
  const url = "https://api.artsy.net/api/artists";
  const headers = {
    "X-XAPP-Token": token
  };
  const params = {
    similar_to_artist_id: artistId, // Use the query parameter from the Artsy API
    size: 10 // Limit to 10 similar artists
  };

  try {
    const response = await axios.get(url, { headers, params });
    console.log("Similar Artists API Response:", response.data);

    if (response.status !== 200) {
      throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }

    const data = response.data;
    const similarArtists = [];

    // Extract similar artists from the response
    const results = data._embedded?.artists || [];
    for (let artist of results) {
      const artist_name = artist.name || "Unknown Artist";
      let artist_image = artist._links?.thumbnail?.href || "";
      const artist_id = artist._links?.self?.href?.split("/").pop();

      if (artist_image.includes("missing_image.png")) {
        artist_image = null;
      }

      similarArtists.push({
        artist_name,
        artist_id,
        artist_image
      });
    }

    return similarArtists;
  } catch (error) {
    console.error("Error fetching similar artists:", error);
    return []; // Return an empty array on error
  }
}

// New endpoint for similar artists
app.get('/api/similar-artists', async (req, res) => {
  const artistId = req.query.artistId; // Get the artist ID from the query parameter

  if (!artistId) {
    return res.status(400).json({ error: "Artist ID is required." });
  }

  try {
    // Get the authentication token (assuming getAuthToken is defined elsewhere)
    const { token } = await getAuthToken(CONFIG.client_id, CONFIG.client_secret);

    if (token) {
      // Fetch similar artists using the artist ID and token
      const similarArtists = await getSimilarArtists(artistId, token);
      return res.json(similarArtists); // Send the similar artists as the response
    } else {
      return res.status(500).json({ error: "Failed to get authentication token." });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching similar artists." });
  }
});
async function getSimilarArtists(artistId, token) {
  const url = `https://api.artsy.net/api/artists?similar_to_artist_id=${artistId}&size=10`; // Corrected URL format
  const headers = {
    "X-XAPP-Token": token
  };

  try {
    const response = await axios.get(url, { headers });
    console.log("Similar Artists API Response:", response.data);

    if (response.status !== 200) {
      throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }

    const data = response.data;
    const similarArtists = [];

    // Extract similar artists from the response
    const results = data._embedded?.artists || [];
    for (let artist of results) {
      const artist_name = artist.name || "Unknown Artist";
      let artist_image = artist._links?.thumbnail?.href || "";
      const artist_id = artist._links?.self?.href?.split("/").pop();

      if (artist_image.includes("missing_image.png")) {
        artist_image = null;
      }

      similarArtists.push({
        artist_name,
        artist_id,
        artist_image
      });
    }

    return similarArtists;
  } catch (error) {
    console.error("Error fetching similar artists:", error);
    return []; // Return an empty array on error
  }
}

// New endpoint for similar artists
app.get('/api/similar-artists', async (req, res) => {
  const artistId = req.query.artistId; // Get the artist ID from the query parameter

  if (!artistId) {
    return res.status(400).json({ error: "Artist ID is required." });
  }

  try {
    // Get the authentication token (assuming getAuthToken is defined elsewhere)
    const { token } = await getAuthToken(CONFIG.client_id, CONFIG.client_secret);

    if (token) {
      // Fetch similar artists using the artist ID and token
      const similarArtists = await getSimilarArtists(artistId, token);
      return res.json(similarArtists); // Send the similar artists as the response
    } else {
      return res.status(500).json({ error: "Failed to get authentication token." });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching similar artists." });
  }
});

async function getArtworks(artistId, token) {
  const url = `https://api.artsy.net/api/artworks?artist_id=${artistId}&size=10`; // Correct API format
  const headers = {
    "X-XAPP-Token": token
  };

  try {
    const response = await axios.get(url, { headers });
    console.log("Artworks API Response:", response.data);

    if (response.status !== 200) {
      throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }

    const data = response.data;
    const artworks = [];

    // Extract artworks from the response
    const results = data._embedded?.artworks || [];
    if (results.length === 0) {
      return { error: "No artworks." };
    }

    for (let artwork of results) {
      const artwork_id = artwork.id;
      const title = artwork.title || "Untitled";
      const date = artwork.date || "Unknown Year";
      let image_url = artwork._links?.thumbnail?.href || "";

      if (image_url.includes("missing_image.png")) {
        image_url = null;
      }

      artworks.push({
        artwork_id,
        title,
        date,
        image_url
      });
    }

    return artworks;
  } catch (error) {
    console.error("Error fetching artworks:", error);
    return { error: "An error occurred while fetching artworks." };
  }
}

// New endpoint for retrieving artworks of an artist
app.get('/api/artworks', async (req, res) => {
  const artistId = req.query.artistId; // Get artist ID from the request query

  if (!artistId) {
    return res.status(400).json({ error: "Artist ID is required." });
  }

  try {
    // Get the authentication token (assuming getAuthToken is defined elsewhere)
    const { token } = await getAuthToken(CONFIG.client_id, CONFIG.client_secret);

    if (token) {
      // Fetch artworks using the artist ID and token
      const artworks = await getArtworks(artistId, token);
      return res.json(artworks); // Send the artworks as the response
    } else {
      return res.status(500).json({ error: "Failed to get authentication token." });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching artworks." });
  }
});

async function getCategories(artworkId, token) {
  const url = `https://api.artsy.net/api/genes?artwork_id=${artworkId}`;
  const headers = {
    "X-XAPP-Token": token
  };

  try {
    const response = await axios.get(url, { headers });
    console.log("Categories API Response:", response.data);

    if (response.status !== 200) {
      throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }

    const data = response.data;
    const categories = [];

    // Extract categories from the response
    const results = data._embedded?.genes || [];
    if (results.length === 0) {
      return { error: "No categories found." };
    }

    for (let category of results) {
      const name = category.name || "Unknown Category";
      let image_url = category._links?.thumbnail?.href || "";

      if (image_url.includes("missing_image.png")) {
        image_url = null;
      }

      categories.push({
        name,
        image_url
      });
    }

    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { error: "An error occurred while fetching categories." };
  }
}

// New endpoint for retrieving categories of an artwork
app.get('/api/categories', async (req, res) => {
  const artworkId = req.query.artworkId; // Get artwork ID from the request query

  if (!artworkId) {
    return res.status(400).json({ error: "Artwork ID is required." });
  }

  try {
    // Get the authentication token (assuming getAuthToken is defined elsewhere)
    const { token } = await getAuthToken(CONFIG.client_id, CONFIG.client_secret);

    if (token) {
      // Fetch categories using the artwork ID and token
      const categories = await getCategories(artworkId, token);
      return res.json(categories); // Send the categories as the response
    } else {
      return res.status(500).json({ error: "Failed to get authentication token." });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching categories." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});