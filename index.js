import express from 'express';
import multer from 'multer';
import { ObjectManager } from '@filebase/sdk';
import dotenv from 'dotenv';
import cors from 'cors'; 

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' })); // Allow all origins — change this in production

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
    console.log(`🚀 Server running 1`);

    const uploadedObject = await objectManager.upload(req.file.originalname, req.file.buffer);
    
 console.log(`🚀 Server running 2`);

    if (uploadedObject && uploadedObject.cid) {
      return res.json({ cid: uploadedObject.cid });
    } else {
       console.log(`🚀 Server running 3`);
      
      return res.status(500).json({ error: 'File upload failed' });
    }
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
  res.send('Hello! Use POST /upload to upload an image.');
});

app.listen(port, () => {
  console.log(`🚀 Server running at  my port http://localhost:${port}`);
});
