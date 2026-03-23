import { Router } from "express";
import {
  getCurrentUser,
  login,
  logout,
  register,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { fileUpload } from "../middleware/upload.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/me", protect, getCurrentUser);
router.put("/profile", protect, fileUpload.single("avatar"), updateProfile);

export default router;
