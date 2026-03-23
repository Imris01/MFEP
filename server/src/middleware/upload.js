import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, "-")}`;
    cb(null, safeName);
  },
});

function assetFileFilter(_req, file, cb) {
  const normalized = file.originalname.toLowerCase();
  const allowed = [
    "maidata.txt",
    "track.mp3",
    "bg.jpg",
    "bg.png",
    "pv.mp4",
    "bg.mp4",
  ];
  const matched = allowed.some((name) => normalized.endsWith(name));

  if (!matched) {
    return cb(new Error("文件名不符合要求，请上传 maidata.txt、track.mp3、bg.jpg/png、pv.mp4 或 bg.mp4"));
  }

  cb(null, true);
}

export const fileUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

export const submissionUpload = multer({
  storage,
  fileFilter: assetFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});
