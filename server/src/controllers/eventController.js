import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Event } from "../models/Event.js";
import { Message } from "../models/Message.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { canViewEvent, isAdmin, isHost, isParticipant } from "../utils/eventHelpers.js";
import { parseMaidata } from "../utils/maidataParser.js";
import { createActionMessage, createNotification } from "../utils/messageHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function uploadAbsolutePath(relativePath) {
  return path.resolve(__dirname, "../../uploads", relativePath.replace("/uploads/", ""));
}

function eventCardSelect(query) {
  return query
    .populate("createdBy", "username avatar email bio")
    .populate("participants", "username avatar")
    .sort({ createdAt: -1 });
}

function deleteStoredFile(relativePath) {
  if (!relativePath || !relativePath.startsWith("/uploads/")) {
    return;
  }

  const fullPath = uploadAbsolutePath(relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function normalizeEventDetail(event) {
  const eventJson = event.toObject ? event.toObject() : event;
  return {
    ...eventJson,
    durationDays: Math.max(
      1,
      Math.ceil((new Date(eventJson.endTime).getTime() - new Date(eventJson.startTime).getTime()) / 86400000) + 1
    ),
  };
}

export async function getHomepageSummary(_req, res) {
  try {
    const [recentEvents, recentPosts] = await Promise.all([
      Event.find({ status: "approved", visibility: "public" })
        .select("title summary bannerImage startTime endTime participants createdBy")
        .populate("createdBy", "username avatar email bio")
        .sort({ createdAt: -1 })
        .limit(5),
      Post.find().select("title createdAt author").populate("author", "username avatar email bio").sort({ createdAt: -1 }).limit(5),
    ]);

    return res.json({ recentEvents, recentPosts });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function createEventApplication(req, res) {
  try {
    const { title, description, rules, summary, startDate, endDate, visibility } = req.body;

    if (!title || !description || !rules || !startDate || !endDate) {
      return res.status(400).json({ message: "请完整填写活动申请信息" });
    }

    const event = await Event.create({
      title,
      description,
      rules,
      summary,
      startTime: new Date(startDate),
      endTime: new Date(endDate),
      visibility: visibility === "private" ? "private" : "public",
      createdBy: req.user._id,
      bannerImage: req.file ? `/uploads/${req.file.filename}` : "",
    });

    const admins = await User.find({ role: "admin" }).select("_id");

    await Promise.all(
      admins.map((admin) =>
        createActionMessage({
          recipient: admin._id,
          sender: req.user._id,
          event: event._id,
          actionType: "event_application_review",
          title: "有新的活动申请待审核",
          content: `${req.user.username} 提交了活动「${event.title}」的开办申请`,
        })
      )
    );

    return res.status(201).json({ message: "活动申请已提交，等待管理员审核" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getPendingApplications(_req, res) {
  try {
    const events = await Event.find({ status: "pending" }).populate("createdBy", "username avatar email bio").sort({ createdAt: -1 });
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function reviewEventApplication(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "活动申请不存在" });
    }

    return res.status(400).json({ message: "请到消息中心处理活动审核消息" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getEvents(_req, res) {
  try {
    const events = await eventCardSelect(Event.find({ status: "approved", visibility: "public" }));
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "username avatar email bio")
      .populate("participants", "username avatar bio")
      .populate("joinRequests.user", "username avatar")
      .populate("submissions.participant", "username avatar email bio");

    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "该活动为私密活动，只有参与者可以查看" });
    }

    return res.json(normalizeEventDetail(event));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function updateEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!isHost(event, req.user)) {
      return res.status(403).json({ message: "只有主办方可以修改活动" });
    }

    const { title, description, rules, summary, startDate, endDate, visibility } = req.body;
    event.title = title ?? event.title;
    event.description = description ?? event.description;
    event.rules = rules ?? event.rules;
    event.summary = summary ?? event.summary;
    event.visibility = visibility ?? event.visibility;
    if (startDate) event.startTime = new Date(startDate);
    if (endDate) event.endTime = new Date(endDate);
    if (req.file) {
      deleteStoredFile(event.bannerImage);
      event.bannerImage = `/uploads/${req.file.filename}`;
    }

    await event.save();
    return res.json({ message: "活动信息已更新" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function deleteEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!isHost(event, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "没有权限删除该活动" });
    }

    deleteStoredFile(event.bannerImage);
    event.submissions.forEach((submission) => Object.values(submission.files).forEach(deleteStoredFile));
    await Message.deleteMany({ event: event._id });
    await event.deleteOne();

    return res.json({ message: "活动已删除" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function requestJoinEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event || event.status !== "approved") {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (isHost(event, req.user)) {
      return res.status(400).json({ message: "主办方已默认属于活动成员" });
    }

    if (isParticipant(event, req.user._id)) {
      return res.status(400).json({ message: "你已经是该活动的参与者" });
    }

    const duplicateRequest = event.joinRequests.some(
      (item) => item.user.toString() === req.user._id.toString() && item.status === "pending"
    );

    if (duplicateRequest) {
      return res.status(400).json({ message: "你已经提交过参与申请，请等待审核" });
    }

    const actionMessage = await createActionMessage({
      recipient: event.createdBy,
      sender: req.user._id,
      event: event._id,
      actionType: "join_request",
      title: "有新的参与申请待处理",
      content: `${req.user.username} 申请加入活动「${event.title}」`,
      payload: { applicant: req.user._id },
    });

    event.joinRequests.push({
      user: req.user._id,
      note: req.body.note || "",
      message: actionMessage._id,
    });

    await event.save();

    return res.json({ message: "参与申请已提交，请等待主办审核" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function leaveEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!isParticipant(event, req.user._id)) {
      return res.status(400).json({ message: "你当前并未参与该活动" });
    }

    event.participants = event.participants.filter((id) => id.toString() !== req.user._id.toString());
    await event.save();

    await createNotification({
      recipient: event.createdBy,
      sender: req.user._id,
      event: event._id,
      title: "活动参与者发生变更",
      content: `${req.user.username} 已退出活动「${event.title}」`,
    });

    return res.json({ message: "你已退出该活动" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function submitWork(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!isParticipant(event, req.user._id)) {
      return res.status(400).json({ message: "只有已参赛用户可以提交作品" });
    }

    const files = req.files || {};
    if (!files.maidata?.[0] || !files.audio?.[0] || !files.cover?.[0]) {
      return res.status(400).json({ message: "请上传必需文件：maidata.txt、track.mp3 和封面图" });
    }

    const maidataContent = fs.readFileSync(files.maidata[0].path, "utf8");
    const parsed = parseMaidata(maidataContent);

    if (!parsed.title || !parsed.artist || !parsed.charterName || !parsed.difficulties?.length) {
      return res.status(400).json({ message: "maidata.txt 缺少必要的标题、曲师、谱师名义或难度信息" });
    }

    event.submissions.push({
      participant: req.user._id,
      title: parsed.title,
      artist: parsed.artist,
      charterName: parsed.charterName,
      summary: "",
      difficulties: parsed.difficulties,
      likes: [],
      comments: [],
      files: {
        maidata: `/uploads/${files.maidata[0].filename}`,
        audio: `/uploads/${files.audio[0].filename}`,
        cover: `/uploads/${files.cover[0].filename}`,
        video: files.video?.[0] ? `/uploads/${files.video[0].filename}` : "",
      },
    });

    await event.save();
    return res.status(201).json({
      message: "作品提交成功",
      parsed,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function toggleSubmissionLike(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限操作该作品" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在" });
    }

    const liked = submission.likes.some((id) => id.toString() === req.user._id.toString());
    submission.likes = liked
      ? submission.likes.filter((id) => id.toString() !== req.user._id.toString())
      : [...submission.likes, req.user._id];

    await event.save();
    return res.json({ message: liked ? "已取消点赞" : "已点赞", likesCount: submission.likes.length });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function addSubmissionComment(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限评论该作品" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在" });
    }

    if (!req.body.content?.trim()) {
      return res.status(400).json({ message: "评论内容不能为空" });
    }

    submission.comments.push({
      author: req.user._id,
      content: req.body.content.trim(),
    });

    await event.save();
    return res.json({ message: "评论已发布" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function deleteSubmission(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!isHost(event, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "只有主办方可以删除作品" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在" });
    }

    Object.values(submission.files).forEach(deleteStoredFile);
    submission.deleteOne();
    await event.save();

    return res.json({ message: "作品已删除" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function downloadSubmissionZip(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限下载该作品" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在" });
    }

    const safeName = `${submission.title.replace(/[\\\\/:*?"<>|]/g, "_")}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
      throw error;
    });
    archive.pipe(res);

    archive.file(uploadAbsolutePath(submission.files.maidata), { name: "maidata.txt" });
    archive.file(uploadAbsolutePath(submission.files.audio), { name: "track.mp3" });
    archive.file(uploadAbsolutePath(submission.files.cover), {
      name: submission.files.cover.endsWith(".png") ? "bg.png" : "bg.jpg",
    });
    if (submission.files.video) {
      archive.file(uploadAbsolutePath(submission.files.video), {
        name: submission.files.video.endsWith("bg.mp4") ? "bg.mp4" : "pv.mp4",
      });
    }

    await archive.finalize();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getParticipants(req, res) {
  try {
    const event = await Event.findById(req.params.id).populate("participants", "username avatar email bio");
    if (!event) {
      return res.status(404).json({ message: "活动不存在" });
    }
    if (!isHost(event, req.user)) {
      return res.status(403).json({ message: "只有主办方可以查看参与者详情" });
    }
    return res.json(event.participants);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function inviteUser(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    const user = await User.findById(req.body.userId);

    if (!event || !user) {
      return res.status(404).json({ message: "活动或用户不存在" });
    }

    if (!isHost(event, req.user)) {
      return res.status(403).json({ message: "只有主办方可以邀请用户" });
    }

    if (isParticipant(event, user._id)) {
      return res.status(400).json({ message: "该用户已经参与该活动" });
    }

    const exists = await Message.findOne({
      recipient: user._id,
      event: event._id,
      actionType: "event_invitation",
      status: "pending",
    });

    if (exists) {
      return res.status(400).json({ message: "该用户已有待处理邀请" });
    }

    await createActionMessage({
      recipient: user._id,
      sender: req.user._id,
      event: event._id,
      actionType: "event_invitation",
      title: "你收到了一条活动邀请",
      content: `${req.user.username} 邀请你加入活动「${event.title}」`,
    });

    return res.json({ message: "邀请已发送" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
