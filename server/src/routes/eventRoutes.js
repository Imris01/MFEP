import { Router } from "express";
import {
  createEventApplication,
  addSubmissionComment,
  deleteEvent,
  deleteSubmission,
  getEventById,
  getEvents,
  getHomepageSummary,
  getParticipants,
  getPendingApplications,
  inviteUser,
  leaveEvent,
  requestJoinEvent,
  reviewEventApplication,
  downloadSubmissionZip,
  submitWork,
  toggleSubmissionLike,
  updateEvent,
} from "../controllers/eventController.js";
import { requireAdmin } from "../middleware/admin.js";
import { protect } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { fileUpload, submissionUpload } from "../middleware/upload.js";

const router = Router();

router.get("/home-summary", getHomepageSummary);
router.get("/", getEvents);
router.get("/applications/pending", protect, requireAdmin, getPendingApplications);
router.get("/:id", optionalAuth, getEventById);
router.get("/:id/participants", protect, getParticipants);
router.get("/:id/submissions/:submissionId/download", optionalAuth, downloadSubmissionZip);
router.post("/applications", protect, fileUpload.single("bannerImage"), createEventApplication);
router.post("/:id/review", protect, requireAdmin, reviewEventApplication);
router.put("/:id", protect, fileUpload.single("bannerImage"), updateEvent);
router.delete("/:id", protect, deleteEvent);
router.post("/:id/join-requests", protect, requestJoinEvent);
router.post("/:id/leave", protect, leaveEvent);
router.post("/:id/invite", protect, inviteUser);
router.post("/:id/submissions/:submissionId/like", protect, toggleSubmissionLike);
router.post("/:id/submissions/:submissionId/comments", protect, addSubmissionComment);
router.delete("/:id/submissions/:submissionId", protect, deleteSubmission);
router.post(
  "/:id/submissions",
  protect,
  submissionUpload.fields([
    { name: "maidata", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  submitWork
);

export default router;
