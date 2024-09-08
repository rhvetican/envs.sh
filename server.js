const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.post("/upload", async (req, res) => {
  const { imageUrl, secret } = req.body;

  try {
    const form = new FormData();

    if (imageUrl) {
      // If an image URL is provided, use it
      form.append("url", imageUrl);
    } else {
      return res.status(400).send("No image URL provided.");
    }

    if (secret) {
      form.append("secret", secret);
    }

    const uploadResponse = await axios({
      method: "POST",
      url: "https://envs.sh",
      data: form,
      headers: form.getHeaders(),
    });

    console.log("Upload Response:", uploadResponse.data); // Log the response from the upload
    res.send(uploadResponse.data);
  } catch (error) {
    // Log detailed error information
    console.error("Error during upload:", {
      message: error.message,
      response: error.response ? error.response.data : "No response data",
      stack: error.stack,
    });
    res.status(500).send(`Error: ${error.message}`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
