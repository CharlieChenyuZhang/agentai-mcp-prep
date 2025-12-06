import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import chat from "./chat.js";

dotenv.config();

const app = express();
app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
});

const PORT = 5001;

let filePath;

app.post("/upload", upload.single("file"), (req, res) => {
  filePath = req.file.path;
  res.send(filePath + "uploaded successfully");
});

app.get("/chat", async (req, res) => {
  const resp = await chat(filePath, req.query.question);
  res.send({
    ragAnswer: resp.text,
    mcpAnswer: "N/A",
  });
});

app.listen(PORT, () => {
  console.log("server is running on port " + PORT);
});
