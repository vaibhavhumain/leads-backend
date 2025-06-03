const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables and connect to DB
dotenv.config();
connectDB();

const app = express();
app.use(express.static('public'));  


// ✅ Define your CORS options
const corsOptions = {
  origin: ['http://localhost:3000', 'https://leadsmanage.netlify.app'],
  credentials: true,
};

// ✅ Use CORS middleware
app.use(cors(corsOptions));

// ✅ Handle preflight OPTIONS requests
app.options('*', cors(corsOptions));

// ✅ Enable JSON parsing
app.use(express.json());

// ✅ Import & use routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const answerRoutes = require('./routes/answerRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const sendRoute = require('./routes/send');
const uploadRoute = require('./routes/upload');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api', enquiryRoutes);
app.use('/api', sendRoute);
app.use('/api', uploadRoute);
// ✅ Base test route
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));