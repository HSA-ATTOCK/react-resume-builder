const express = require('express');
const path = require('path');
const fs = require('fs');  // Add this at the top
const app = express();
const PORT = process.env.PORT || 5000;

// Debug: Check if 'dist' exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: "dist" folder missing. Run "npm run build" first.');
  process.exit(1);
}

// Debug: List files in 'dist'
console.log('Files in "dist":', fs.readdirSync(distPath));

app.use(express.static(distPath, {
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error('Failed to load index.html:', err);
      res.status(500).send('Application build is corrupted.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
