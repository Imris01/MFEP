import mongoose from "mongoose";

const eventSubmissionSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    charterName: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    artist: {
      type: String,
      required: true,
      trim: true,
    },
    difficulties: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        value: { type: String, required: true },
        color: { type: String, required: true },
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    files: {
      maidata: { type: String, required: true },
      audio: { type: String, required: true },
      cover: { type: String, required: true },
      video: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    rules: {
      type: String,
      required: true,
      trim: true,
    },
    bannerImage: {
      type: String,
      default: "",
    },
    summary: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    joinRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
        note: {
          type: String,
          default: "",
          trim: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],
    submissions: [eventSubmissionSchema],
  },
  { timestamps: true }
);

export const Event = mongoose.model("Event", eventSchema);
