const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes'); // Auth routes
const userRoutes = require('./routes/userRoutes'); // User routes
const leadRoutes = require('./routes/leadRoutes'); // Leads routes
const enquiryRoutes = require('./routes/enquiryRoutes'); // Enquiry routes
const answerRoutes = require('./routes/answerRoutes'); // Answer routes 

dotenv.config();
connectDB();

const app = express();
const corsOptions = {
  origin: ['http://localhost:3000', 'https://leadsmanage.netlify.app'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

app.use('/api/auth', authRoutes); // Now auth has its own route
app.use('/api/users', userRoutes); // Separate user management
app.use('/api/leads', leadRoutes); // Lead-related operations
app.use('/api/answers', answerRoutes); // Answer-related operations
app.use('/api/enquiries', enquiryRoutes); // Enquiry-related operations
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
