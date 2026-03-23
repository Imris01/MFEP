import { Router } from "express";
import { getUsers, updateUserRole } from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/admin.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireAdmin);
router.get("/users", getUsers);
router.put("/users/:id/role", updateUserRole);

export default router;
