const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ✅ Always put express.json() before route handling
app.use(express.json());

// ✅ Serve static files if needed
app.use(express.static('public'));

// ✅ CORS Configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://leadsmanage.netlify.app'],
  credentials: true,
};

app.use(cors(corsOptions));

// ✅ Handle preflight (OPTIONS) requests globally
app.use(cors(corsOptions));

// ✅ Preflight for all routes
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ✅ Request logger (optional)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// ✅ Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const answerRoutes = require('./routes/answerRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const uploadRoute = require('./routes/upload');
const sendRoute = require('./routes/send');
const pauseLogRoutes = require('./routes/pauseLogs');
const leadTimerLogsRoute = require('./routes/leadTimerLogs');
const notificationRoutes = require('./routes/notificationRoutes');
const proposalRoutes = require('./routes/proposalRoutes');


// ✅ Route usage
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/enquiry', enquiryRoutes);
app.use('/api/upload', uploadRoute);
app.use('/api/send', sendRoute);
app.use('/api/pause-logs', pauseLogRoutes);
app.use('/api/timer-logs', leadTimerLogsRoute);
app.use('/api/notifications',notificationRoutes);
app.use('/api/proposal', proposalRoutes);

// ✅ Root route
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
