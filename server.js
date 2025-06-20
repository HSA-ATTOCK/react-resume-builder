const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

// Verify dist folder exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: dist folder not found. Did you run "npm run build"?');
  process.exit(1);
}

app.use(express.static(distPath, {
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000');
  },
  fallthrough: false // Important for strict static file serving
}));

app.get('*', (req, res, next) => {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send('Application not built properly - missing index.html');
  }
  res.sendFile(indexPath, (err) => {
    if (err) next(err);
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).send('Application error - check server logs');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`Serving from: ${distPath}`);
  console.log('Available files:', fs.readdirSync(distPath));
});
