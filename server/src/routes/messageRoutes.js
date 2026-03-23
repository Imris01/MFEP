import { Router } from "express";
import { deleteMessage, markAllMessagesRead } from "../controllers/messageManageController.js";
import { getMessages, getUnreadSummary, respondMessage } from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/summary", protect, getUnreadSummary);
router.get("/", protect, getMessages);
router.post("/read-all", protect, markAllMessagesRead);
router.post("/:id/respond", protect, respondMessage);
router.delete("/:id", protect, deleteMessage);

export default router;
