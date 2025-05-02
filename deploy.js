const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

// Import server routes
const apiRoutes = require('./server');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security and optimization middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'via.placeholder.com', 'data:'],
      connectSrc: ["'self'", 'dyiuezrvgafcmgrikilg.supabase.co', 'api.openai.com']
    }
  }
}));
app.use(compression());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Use API routes
app.use('/api', apiRoutes);

// Send all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
}); 