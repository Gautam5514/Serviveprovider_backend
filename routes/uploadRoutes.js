const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/rateLimiter");
const cloudinary = require("../config/cloudinary");

// Multer config — files are held in memory only, then streamed straight to
// Cloudinary. Nothing touches local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images and pdfs
    const filetypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images and PDFs are allowed!"));
    }
  },
});

// Streams a buffer to Cloudinary and resolves with the upload result.
function uploadBufferToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "elitecrewplace/uploads",
        resource_type: "auto", // auto-detects image vs. pdf
        filename_override: originalName,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Single file upload route — auth required (KYC docs, work proofs, profile
// photos are all uploaded by signed-in users) + rate-limited against abuse.
// Uploads go straight to Cloudinary; the response returns the hosted URL.
router.post("/", protect, uploadLimiter, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      fileUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Upload failed" });
  }
});

// Error handling middleware specifically for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File size cannot exceed 2MB." });
    }
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
