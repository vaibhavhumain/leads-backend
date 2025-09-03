const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ✅ JSON & URL-encoded parsers with larger limit (fixes 413 errors)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Serve static files if needed
app.use(express.static('public'));

// ✅ Correct CORS Configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://leadsmanage.netlify.app' , 'https://leads-portal.gobindcoach.com'], // allowed frontends
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
  credentials: true,
};

// ✅ Apply CORS once
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
const reportRoutes = require('./routes/reportRoutes');

// ✅ Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/enquiry', enquiryRoutes);
app.use('/api/upload', uploadRoute);
app.use('/api/send', sendRoute);
app.use('/api/pause-logs', pauseLogRoutes);
app.use('/api/timer-logs', leadTimerLogsRoute);
app.use('/api/notifications', notificationRoutes);
app.use('/api/proposal', proposalRoutes);
app.use('/api/reports', reportRoutes);

// ✅ Root route
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
