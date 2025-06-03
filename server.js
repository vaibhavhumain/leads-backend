// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(express.static('public'));

// ✅ CORS Configuration (Simple and Render-friendly)
app.use(cors({
  origin: ['http://localhost:3000', 'https://leadsmanage.netlify.app'],
  credentials: true,
}));

// ✅ Request logger (Optional)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

app.use(express.json());

// ✅ Import & use routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const answerRoutes = require('./routes/answerRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const uploadRoute = require('./routes/upload');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api', enquiryRoutes);
app.use('/api/upload', uploadRoute);

// ✅ Test Route
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
