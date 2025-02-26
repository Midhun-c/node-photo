import express from 'express';
import multer from 'multer';
import { ObjectManager } from '@filebase/sdk';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors'; 


dotenv.config();

const app = express();
const PORT =  process.env.PORT || 3000;

app.use(cors());


app.use(cors({
  origin: 'https://midhun-c.github.io', // Replace with your GitHub Pages URL
  methods: ['GET', 'POST'],
}));
const upload = multer({ storage: multer.memoryStorage() });

const S3_KEY = process.env.FILEBASE_KEY;
const S3_SECRET = process.env.FILEBASE_SECRET;
const bucketName = process.env.FILEBASE_BUCKET;

if (!S3_KEY || !S3_SECRET || !bucketName) {
  console.error('❌ Missing Filebase credentials. Check your .env file!');
  process.exit(1);
}

const objectManager = new ObjectManager(S3_KEY, S3_SECRET, { bucket: bucketName });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedObject = await objectManager.upload(req.file.originalname, req.file.buffer);

    if (uploadedObject && uploadedObject.cid) {
      return res.json({ cid: uploadedObject.cid });
    } else {
      return res.status(500).json({ error: 'File upload failed' });
    }
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
