import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["notification", "action"],
      required: true,
    },
    actionType: {
      type: String,
      enum: ["none", "event_application_review", "join_request", "event_invitation", "mention"],
      default: "none",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    payload: {
      applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["unread", "pending", "accepted", "rejected", "read"],
      default: "unread",
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
