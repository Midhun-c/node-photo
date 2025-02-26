import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// Handle __dirname in ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS
app.use(cors());

// Configure Multer for file uploads (store in local "uploads" folder)
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    cb(null, 'uploaded_image' + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Upload and respond with the image
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.sendFile(path.join(__dirname, 'uploads', req.file.filename));
});

// Serve the uploaded image statically
app.get('/image', (req, res) => {
  const imagePath = path.join(__dirname, 'uploads', 'uploaded_image.png');
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).send('Image not found');
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Hello World! Try uploading an image to /upload or access /image');
});

// Start server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
