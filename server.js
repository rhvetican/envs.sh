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
    } else if (req.files && req.files.file) {
      // If a file is uploaded
      const tempFilePath = path.join("/tmp", "temp.jpg");
      const writer = fs.createWriteStream(tempFilePath);
      req.files.file.mv(tempFilePath, (err) => {
        if (err) return res.status(500).send(err);
      });

      form.append("file", fs.createReadStream(tempFilePath), {
        filename: "temp.jpg",
        contentType: "image/jpg",
      });
    } else {
      return res.status(400).send("No image URL or file provided.");
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

    // Clean up the temporary file if it was created
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    res.send(uploadResponse.data);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
