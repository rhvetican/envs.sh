const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up file upload handling with multer
const upload = multer({ dest: "uploads/" });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Ensure the temporary directory exists
const tempDir = path.join(__dirname, "tmp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

app.post("/upload", upload.single("imageFile"), async (req, res) => {
  const imageUrl = req.body.imageUrl;
  const secret = req.body.secret; // Optional secret parameter
  const expires = req.body.expires; // Optional expires parameter
  let tempFilePath;

  try {
    if (req.file) {
      // Handle local file upload
      tempFilePath = req.file.path;
    } else if (imageUrl) {
      // Handle URL-based upload
      const response = await axios({
        method: "GET",
        url: imageUrl,
        responseType: "stream",
      });

      tempFilePath = path.join(tempDir, "temp.jpg"); // Use the new temp directory
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    } else {
      return res.status(400).send("No image URL or file provided.");
    }

    // Prepare file for upload to envs.sh
    const form = new FormData();
    if (req.file) {
      form.append("file", fs.createReadStream(tempFilePath), {
        filename: req.file.originalname || "temp.jpg",
        contentType: req.file.mimetype || "image/jpeg",
      });
    } else if (imageUrl) {
      form.append("url", imageUrl);
    }

    // Add optional parameters
    if (secret) {
      form.append("secret", secret);
    }
    if (expires) {
      form.append("expires", expires);
    }

    const uploadResponse = await axios({
      method: "POST",
      url: "https://envs.sh",
      data: form,
      headers: form.getHeaders(),
    });

    // Remove temporary file asynchronously
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error("Error deleting temp file:", err);
      });
    }

    // Send the response
    res.send(uploadResponse.data);
  } catch (error) {
    console.error("Error details:", error); // Log the error details
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error("Error deleting temp file:", err);
      });
    }

    let errorMessage = "An unexpected error occurred.";
    
    if (error.response) {
      errorMessage = `Error from envs.sh: ${error.response.data.message || error.message}`;
      console.error("Response data:", error.response.data); // Log the response data
      console.error("Response status:", error.response.status); // Log the response status
    } else if (error.code) {
      errorMessage = `File system error: ${error.code}`;
    }

    res.status(500).send(errorMessage);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
