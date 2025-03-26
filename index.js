import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import multer from "multer";
import mongoose from "mongoose";
import { ObjectManager } from "@filebase/sdk";


// Load environment variables
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// MongoDB Schema for Users & CID Storage
const UserSchema = new mongoose.Schema({
  uid: String,
  email: String,
});
const UserCIDSchema = new mongoose.Schema({
  email: String,
  cid: String,
});

const User = mongoose.model("User", UserSchema);
const UserCID = mongoose.model("UserCID", UserCIDSchema);

// Middleware: Verify Firebase Token
async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    console.log("✅ Decoded Token:", req.user);

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid Token" });
  }
}

// Register User in MongoDB
app.post("/register", verifyToken, async (req, res) => {
  try {
    const { uid, email } = req.user;
    await User.updateOne({ uid }, { $set: { email, uid } }, { upsert: true });
    res.json({ message: "User registered" });
  } catch (error) {
    res.status(500).json({ error: "Error registering user" });
  }
});

// Filebase Setup for IPFS
const upload = multer({ storage: multer.memoryStorage() });

const S3_KEY = process.env.FILEBASE_KEY;
const S3_SECRET = process.env.FILEBASE_SECRET;
const bucketName = process.env.FILEBASE_BUCKET;

if (!S3_KEY || !S3_SECRET || !bucketName) {
  console.error("❌ Missing Filebase credentials. Check your .env file!");
  process.exit(1);
}

const objectManager = new ObjectManager(S3_KEY, S3_SECRET, { bucket: bucketName });

// Create an Express Router
const router = express.Router();

// Upload Image & Store CID in MongoDB
router.post("/upload", verifyToken, upload.single("image"), async (req, res) => {
  try {
    console.log("📥 Request Headers:", req.headers);
    console.log("📂 Received file:", req.file);  
    console.log("👤 Authenticated User:", req.user);  

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 🔹 Upload to IPFS (Filebase)
    const uploadResponse = await objectManager.upload(req.file.originalname, req.file.buffer);

    console.log("🌍 IPFS Upload Response:", uploadResponse);
    const cid = uploadResponse.cid;

    // 🔹 Store CID in MongoDB
    await UserCID.create({ email: req.user.email, cid });

    res.status(200).json({ message: "File uploaded successfully!", cid });
  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fetch all CIDs for a user
router.get("/user-cids/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const userCIDs = await UserCID.find({ email: new RegExp(email, "i") }); // Case-insensitive search
    res.json(userCIDs);
  } catch (error) {
    console.error("❌ Error fetching CIDs:", error);
    res.status(500).json({ error: "Failed to fetch CIDs" });
  }
});

// Use the router
app.use(router);

// Health Check
app.get("/", (req, res) => {
  res.send("🚀 Server is running! Use POST /upload to upload an image.");
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
