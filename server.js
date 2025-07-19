// Backend server for Deecent registration and login
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Replace with your MongoDB Atlas connection string
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User schema
const userSchema = new mongoose.Schema({
  orgName: String,
  orgWebsite: String,
  contactName: String,
  contactEmail: String,
  contactPhone: String,
  password: String // Note: In production, hash passwords!
});
const User = mongoose.model('User', userSchema);

// Feedback schema
const feedbackSchema = new mongoose.Schema({
  candidateName: String,
  aadharId: String,
  phone: String,
  email: String,
  feedback: String,
  submittedAt: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    // Trim whitespace from all fields
    const payload = {
      orgName: req.body.orgName?.trim(),
      orgWebsite: req.body.orgWebsite?.trim(),
      contactName: req.body.contactName?.trim(),
      contactEmail: req.body.contactEmail?.trim(),
      contactPhone: req.body.contactPhone?.trim(),
      password: req.body.password?.trim()
    };
    console.log('Register payload:', payload);
    const existingUser = await User.findOne({ contactEmail: payload.contactEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'User already registered' });
    }
    const user = new User(payload);
    await user.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const contactEmail = req.body.contactEmail?.trim().toLowerCase();
    const password = req.body.password?.trim();
    console.log('Login payload:', { contactEmail, password });
    const user = await User.findOne({ contactEmail: { $regex: `^${contactEmail}$`, $options: 'i' }, password });
    console.log('User found:', user);
    if (user) {
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// Get user profile by email
app.get('/api/profile', async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ contactEmail: email });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Debug endpoint: List all users
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// Store feedback endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const fb = new Feedback({
      candidateName: req.body.candidateName?.trim(),
      aadharId: req.body.aadharId?.trim(),
      phone: req.body.phone?.trim(),
      email: req.body.email?.trim(),
      feedback: req.body.feedback?.trim()
    });
    await fb.save();
    res.status(201).json({ message: 'Feedback submitted' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback', details: err.message });
  }
});

// Debug endpoint: List all feedbacks
// Search candidate endpoint
app.get('/api/search-candidate', async (req, res) => {
  try {
    const { candidateName, aadharId } = req.query;
    const query = {};
    if (candidateName) query.candidateName = { $regex: candidateName, $options: 'i' };
    if (aadharId) query.aadharId = { $regex: aadharId, $options: 'i' };
    const feedbacks = await Feedback.find(query).sort({ submittedAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search candidates', details: err.message });
  }
});
app.get('/api/debug/feedbacks', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({});
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedbacks', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
