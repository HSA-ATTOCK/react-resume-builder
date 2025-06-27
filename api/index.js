<<<<<<< HEAD
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

module.exports = app;
=======
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

module.exports = app;
>>>>>>> da659ab2c95ce83ac9ebcdd9840fce9d04bb7fcb
