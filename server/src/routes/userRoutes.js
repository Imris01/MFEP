import { Router } from "express";
import { getUserProfile, searchUsers } from "../controllers/userController.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = Router();

router.get("/", searchUsers);
router.get("/:id", optionalAuth, getUserProfile);

export default router;
