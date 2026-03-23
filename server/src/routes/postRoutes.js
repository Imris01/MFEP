import { Router } from "express";
import {
  addComment,
  createPost,
  getPostById,
  getPosts,
  toggleCommentLike,
  togglePostLike,
} from "../controllers/postController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", getPosts);
router.get("/:id", getPostById);
router.post("/", protect, createPost);
router.post("/:id/comments", protect, addComment);
router.post("/:id/like", protect, togglePostLike);
router.post("/:id/comments/:commentId/like", protect, toggleCommentLike);

export default router;
