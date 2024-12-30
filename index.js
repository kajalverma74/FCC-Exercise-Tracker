require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch((error) => {
    console.error('MongoDB connection error:', error.message); // More detailed error message
    process.exit(1); // Exit the process if MongoDB connection fails
  });

// Define User and Exercise models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// POST /api/users to create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });

  try {
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(400).json({ error: 'Error creating user' });
  }
});

// GET /api/users to get a list of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: 'Error fetching users' });
  }
});

// POST /api/users/:_id/exercises to add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;

  // If no date is provided, use the current date
  const exerciseDate = date || new Date().toDateString();

  // Create a new exercise
  const newExercise = new Exercise({
    description,
    duration,
    date: exerciseDate,
    userId: _id,
  });

  try {
    // Save the exercise
    await newExercise.save();

    // Fetch the user by ID
    const user = await User.findById(_id);

    // Return the user object with exercise fields added directly in the response
    res.json({
      username: user.username,
      _id: user._id,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date,
    });
  } catch (err) {
    res.status(400).json({ error: 'Error adding exercise' });
  }
});

// GET /api/users/:_id/logs to get the exercise log of a user
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const query = { userId: _id };

  if (from || to) {
    if (from) query.date = { $gte: new Date(from).toDateString() };
    if (to) query.date = { $lte: new Date(to).toDateString() };
  }

  try {
    const user = await User.findById(_id);
    const exercises = await Exercise.find(query).limit(parseInt(limit) || 0);
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date,
      })),
    });
  } catch (err) {
    res.status(400).json({ error: 'Error fetching logs' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
