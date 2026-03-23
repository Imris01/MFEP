import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Event } from "../models/Event.js";
import { Message } from "../models/Message.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import {
  buildParticipantRoles,
  canManageMembers,
  canScoreSubmission,
  canViewEvent,
  isAdmin,
  isBsMember,
  isHost,
  isJudge,
  isManager,
  isParticipant,
  isTester,
  normalizeRoleAssignments,
  objectIdEquals,
} from "../utils/eventHelpers.js";
import { parseMaidata } from "../utils/maidataParser.js";
import { createActionMessage, createNotification } from "../utils/messageHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function uploadAbsolutePath(relativePath) {
  return path.resolve(__dirname, "../../uploads", relativePath.replace("/uploads/", ""));
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

function toBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function toStringArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => toStringArray(item));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch (_error) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [String(value)];
}

function toWeightedMembers(ids, weights = {}) {
  return ids.map((user) => ({
    user,
    weight: Number(weights[user] ?? 1) || 1,
  }));
}

function eventPopulation(query) {
  return query
    .populate("createdBy", "username avatar email bio")
    .populate("participants", "username avatar email bio")
    .populate("managers", "username avatar email bio")
    .populate("judges.user", "username avatar email bio")
    .populate("testers.user", "username avatar email bio")
    .populate("bsMembers", "username avatar email bio")
    .populate("joinRequests.user", "username avatar email bio")
    .populate("submissions.participant", "username avatar email bio")
    .populate("submissions.comments.author", "username avatar email bio")
    .populate("submissions.ratings.author", "username avatar email bio");
}

function getEventState(event) {
  const now = Date.now();
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();

  if (now < start) {
    return "upcoming";
  }

  if (now > end) {
    return "ended";
  }

  return "active";
}

function getRoleWeights(event, userId) {
  const judgeWeight = (event.judges || []).find((item) => objectIdEquals(item.user?._id || item.user, userId))?.weight || 1;
  const testerWeight = (event.testers || []).find((item) => objectIdEquals(item.user?._id || item.user, userId))?.weight || 1;

  return {
    judgeWeight,
    testerWeight,
    bsWeight: isBsMember(event, userId) ? 1 : 0,
    contestantWeight: isParticipant(event, userId) ? 1 : 0,
  };
}

function buildSubmissionView(event, submission, viewer) {
  const viewerId = viewer?._id || viewer?.id;
  const participant = submission.participant;
  const participantId = participant?._id || participant;
  const isAnonymousAuthor = event.isAnonymous;
  const displayCharterName = isAnonymousAuthor
    ? submission.charterName
    : `${participant?.username || "用户"}@${submission.charterName}`;

  const comments = (submission.comments || []).map((comment) => ({
    _id: comment._id,
    content: comment.content,
    anonymous: comment.anonymous,
    createdAt: comment.createdAt,
    author: comment.anonymous
      ? null
      : comment.author
        ? {
            _id: comment.author._id,
            id: comment.author._id,
            username: comment.author.username,
            avatar: comment.author.avatar,
            email: comment.author.email,
            bio: comment.author.bio,
          }
        : null,
    displayAuthorName: comment.anonymous ? "匿名评论" : comment.author?.username || "用户",
  }));

  const ratings = (submission.ratings || []).map((rating) => ({
    _id: rating._id,
    score: rating.score,
    anonymous: rating.anonymous,
    createdAt: rating.createdAt,
    author: rating.anonymous
      ? null
      : rating.author
        ? {
            _id: rating.author._id,
            id: rating.author._id,
            username: rating.author.username,
            avatar: rating.author.avatar,
          }
        : null,
    displayAuthorName: rating.anonymous ? "匿名评分" : rating.author?.username || "用户",
  }));

  const averageScore = ratings.length
    ? Number((ratings.reduce((total, item) => total + Number(item.score || 0), 0) / ratings.length).toFixed(2))
    : null;

  return {
    _id: submission._id,
    title: submission.title,
    artist: submission.artist,
    charterName: submission.charterName,
    displayCharterName,
    summary: submission.summary || "",
    participant: participant
      ? {
          _id: participant._id,
          id: participant._id,
          username: participant.username,
          avatar: participant.avatar,
          email: participant.email,
          bio: participant.bio,
        }
      : null,
    showRealAuthor: !isAnonymousAuthor,
    difficulties: submission.difficulties || [],
    likesCount: submission.likes?.length || 0,
    likedByCurrentUser: Boolean(viewerId && (submission.likes || []).some((id) => objectIdEquals(id, viewerId))),
    commentsCount: comments.length,
    ratingsCount: ratings.length,
    averageScore,
    files: submission.files,
    createdAt: submission.createdAt,
    comments,
    ratings,
  };
}

function buildParticipantView(event, user, viewer) {
  return {
    _id: user._id,
    id: user._id,
    username: user.username,
    avatar: user.avatar,
    email: user.email,
    bio: user.bio,
    roles: buildParticipantRoles(event, user._id, viewer),
    weights: getRoleWeights(event, user._id),
  };
}

function normalizeEventDetail(event, viewer) {
  normalizeRoleAssignments(event);

  const participants = (event.participants || []).map((participant) => buildParticipantView(event, participant, viewer));
  const submissions = [...(event.submissions || [])]
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    .map((submission, index) => ({
      ...buildSubmissionView(event, submission, viewer),
      orderNumber: index + 1,
    }));

  return {
    _id: event._id,
    title: event.title,
    summary: event.summary,
    description: event.description,
    rules: event.rules,
    bannerImage: event.bannerImage,
    startTime: event.startTime,
    endTime: event.endTime,
    status: event.status,
    state: getEventState(event),
    activityType: event.activityType,
    visibility: event.visibility,
    isAnonymous: event.isAnonymous,
    useJudgeGroup: event.useJudgeGroup,
    judgeGroupPublic: event.judgeGroupPublic,
    useBsGroup: event.useBsGroup,
    bsGroupPublic: event.bsGroupPublic,
    useTestGroup: event.useTestGroup,
    testGroupPublic: event.testGroupPublic,
    useManagers: event.useManagers,
    scoreFormula: event.scoreFormula,
    durationDays: Math.max(
      1,
      Math.ceil((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 86400000) + 1
    ),
    createdBy: event.createdBy,
    createdByRoles: buildParticipantRoles(event, event.createdBy?._id || event.createdBy, viewer),
    participants,
    participantCount: participants.length + 1,
    canEdit: Boolean(viewer && (isAdmin(viewer) || isHost(event, viewer))),
    canManageMembers: Boolean(viewer && canManageMembers(event, viewer)),
    canJoin:
      Boolean(viewer) &&
      !isHost(event, viewer) &&
      !isParticipant(event, viewer._id || viewer.id) &&
      event.status === "approved",
    canSubmit:
      Boolean(viewer) &&
      (isParticipant(event, viewer._id || viewer.id) || isHost(event, viewer) || isManager(event, viewer._id || viewer.id)),
    canLeave: Boolean(viewer) && isParticipant(event, viewer._id || viewer.id),
    submissions,
  };
}

async function applyEventForm(event, req) {
  const body = req.body || {};

  event.title = body.title ?? event.title;
  event.summary = body.summary ?? event.summary;
  event.description = body.description ?? event.description;
  event.rules = body.rules ?? event.rules;
  event.activityType = body.activityType || event.activityType || "project";
  event.visibility = toBoolean(body.isPrivate) ? "private" : "public";
  event.isAnonymous = toBoolean(body.isAnonymous);

  if (event.activityType === "contest") {
    event.useJudgeGroup = toBoolean(body.useJudgeGroup);
    event.judgeGroupPublic = toBoolean(body.judgeGroupPublic);
    event.useBsGroup = toBoolean(body.useBsGroup);
    event.bsGroupPublic = toBoolean(body.bsGroupPublic);
    event.useTestGroup = toBoolean(body.useTestGroup);
    event.testGroupPublic = toBoolean(body.testGroupPublic);
    event.useManagers = toBoolean(body.useManagers);
    event.scoreFormula = body.scoreFormula?.trim?.() || "";
  } else {
    event.useJudgeGroup = false;
    event.judgeGroupPublic = false;
    event.useBsGroup = false;
    event.bsGroupPublic = false;
    event.useTestGroup = false;
    event.testGroupPublic = false;
    event.useManagers = false;
    event.scoreFormula = "";
  }

  if (body.startDate) {
    event.startTime = new Date(body.startDate);
  }

  if (body.endDate) {
    event.endTime = new Date(body.endDate);
  }

  const participantIds = new Set((event.participants || []).map((item) => item.toString()));
  const managerIds = toStringArray(body.managerIds).filter((item) => participantIds.has(item));
  const judgeIds = toStringArray(body.judgeIds).filter((item) => participantIds.has(item));
  const testerIds = toStringArray(body.testerIds).filter((item) => participantIds.has(item));
  const bsIds = toStringArray(body.bsMemberIds).filter((item) => participantIds.has(item));

  const judgeWeights = body.judgeWeights ? JSON.parse(body.judgeWeights) : {};
  const testerWeights = body.testerWeights ? JSON.parse(body.testerWeights) : {};

  event.managers = event.useManagers ? managerIds : [];
  event.judges = event.useJudgeGroup ? toWeightedMembers(judgeIds, judgeWeights) : [];
  event.testers = event.useTestGroup ? toWeightedMembers(testerIds, testerWeights) : [];
  event.bsMembers = event.useBsGroup ? bsIds : [];

  if (req.file) {
    deleteStoredFile(event.bannerImage);
    event.bannerImage = `/uploads/${req.file.filename}`;
  }

  normalizeRoleAssignments(event);
}

export async function getHomepageSummary(_req, res) {
  try {
    const [recentEvents, recentPosts] = await Promise.all([
      Event.find({ status: "approved", visibility: "public" })
        .select("title summary bannerImage startTime endTime participants createdBy activityType visibility")
        .populate("createdBy", "username avatar email bio")
        .sort({ createdAt: -1 })
        .limit(5),
      Post.find().select("title createdAt author").populate("author", "username avatar email bio").sort({ createdAt: -1 }).limit(5),
    ]);

    return res.json({
      recentEvents: recentEvents.map((event) => ({
        ...event.toObject(),
        participantCount: (event.participants?.length || 0) + 1,
        state: getEventState(event),
      })),
      recentPosts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function createEventApplication(req, res) {
  try {
    const { title, description, rules, startDate, endDate } = req.body;

    if (!title || !description || !rules || !startDate || !endDate) {
      return res.status(400).json({ message: "请完整填写活动申请信息。" });
    }

    const event = await Event.create({
      title: title.trim(),
      summary: req.body.summary?.trim?.() || "",
      description: description.trim(),
      rules: rules.trim(),
      startTime: new Date(startDate),
      endTime: new Date(endDate),
      createdBy: req.user._id,
      participants: [],
      bannerImage: req.file ? `/uploads/${req.file.filename}` : "",
    });

    await applyEventForm(event, req);
    await event.save();

    const admins = await User.find({ role: "admin" }).select("_id");

    await Promise.all(
      admins.map((admin) =>
        createActionMessage({
          recipient: admin._id,
          sender: req.user._id,
          event: event._id,
          actionType: "event_application_review",
          title: "有新的活动申请审核",
          content: `${req.user.username} 提交了活动「${event.title}」的开办申请。`,
        })
      )
    );

    return res.status(201).json({ message: "活动申请已提交，等待管理员审核。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getPendingApplications(_req, res) {
  try {
    const events = await eventPopulation(
      Event.find({ status: "pending" }).sort({ createdAt: -1 })
    );
    return res.json(events.map((event) => normalizeEventDetail(event, null)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function reviewEventApplication(req, res) {
  return res.status(400).json({ message: "请到消息中心处理活动审核消息。" });
}

export async function getEvents(req, res) {
  try {
    const query = Event.find({ status: "approved" }).sort({ createdAt: -1 });
    const events = await eventPopulation(query);
    const visibleEvents = events.filter((event) => canViewEvent(event, req.user));
    return res.json(visibleEvents.map((event) => normalizeEventDetail(event, req.user)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getEventById(req, res) {
  try {
    const event = await eventPopulation(Event.findById(req.params.id));

    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "这是私密活动，只有活动参与者可以查看。" });
    }

    return res.json(normalizeEventDetail(event, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function updateEvent(req, res) {
  try {
    const event = await eventPopulation(Event.findById(req.params.id));

    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!isHost(event, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "只有主办可以修改活动信息。" });
    }

    await applyEventForm(event, req);
    await event.save();

    return res.json({
      message: "活动信息已更新。",
      event: normalizeEventDetail(event, req.user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function deleteEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!isHost(event, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "没有权限删除该活动。" });
    }

    deleteStoredFile(event.bannerImage);
    event.submissions.forEach((submission) => Object.values(submission.files || {}).forEach(deleteStoredFile));
    await Message.deleteMany({ event: event._id });
    await event.deleteOne();

    return res.json({ message: "活动已删除。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function requestJoinEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event || event.status !== "approved") {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (isHost(event, req.user)) {
      return res.status(400).json({ message: "主办默认属于活动成员。" });
    }

    if (isParticipant(event, req.user._id)) {
      return res.status(400).json({ message: "你已经是该活动的参与者。" });
    }

    const duplicateRequest = event.joinRequests.some(
      (item) => objectIdEquals(item.user, req.user._id) && item.status === "pending"
    );

    if (duplicateRequest) {
      return res.status(400).json({ message: "你已经提交过参与申请，请等待审核。" });
    }

    const recipientIds = [event.createdBy, ...(event.managers || [])];
    const createdMessages = await Promise.all(
      recipientIds
        .filter((recipientId, index) => recipientIds.findIndex((item) => objectIdEquals(item, recipientId)) === index)
        .map((recipient) =>
          createActionMessage({
            recipient,
            sender: req.user._id,
            event: event._id,
            actionType: "join_request",
            title: "有新的参与申请待处理",
            content: `${req.user.username} 申请加入活动「${event.title}」。`,
            payload: { applicant: req.user._id },
          })
        )
    );

    event.joinRequests.push({
      user: req.user._id,
      note: req.body.note?.trim?.() || "",
      message: createdMessages[0]?._id,
    });

    await event.save();
    return res.json({ message: "参与申请已提交，请等待主办或管理员审核。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function leaveEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!isParticipant(event, req.user._id)) {
      return res.status(400).json({ message: "你当前并未参加该活动。" });
    }

    event.participants = event.participants.filter((id) => !objectIdEquals(id, req.user._id));
    event.managers = (event.managers || []).filter((id) => !objectIdEquals(id, req.user._id));
    event.bsMembers = (event.bsMembers || []).filter((id) => !objectIdEquals(id, req.user._id));
    event.judges = (event.judges || []).filter((item) => !objectIdEquals(item.user, req.user._id));
    event.testers = (event.testers || []).filter((item) => !objectIdEquals(item.user, req.user._id));
    await event.save();

    await createNotification({
      recipient: event.createdBy,
      sender: req.user._id,
      event: event._id,
      title: "活动人员发生变更",
      content: `${req.user.username} 已退出活动「${event.title}」。`,
    });

    return res.json({ message: "你已退出该活动。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function submitWork(req, res) {
  try {
    const event = await Event.findById(req.params.id).populate("participants", "username avatar email bio");

    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    const userId = req.user._id;
    if (!isParticipant(event, userId) && !isHost(event, req.user) && !isManager(event, userId)) {
      return res.status(400).json({ message: "只有已参赛用户才可以提交作品。" });
    }

    const files = req.files || {};
    if (!files.maidata?.[0] || !files.audio?.[0] || !files.cover?.[0]) {
      return res.status(400).json({ message: "请上传必需文件：maidata.txt、track.mp3 和封面图。" });
    }

    const maidataBuffer = fs.readFileSync(files.maidata[0].path);
    const maidataContent = maidataBuffer.toString("utf8").replace(/^\uFEFF/, "");
    const parsed = parseMaidata(maidataContent);

    if (!parsed.title || !parsed.artist || !parsed.charterName || !parsed.difficulties?.length) {
      return res.status(400).json({ message: "maidata.txt 缺少必要的标题、曲师、谱师名义或难度信息。" });
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
      ratings: [],
      files: {
        maidata: `/uploads/${files.maidata[0].filename}`,
        audio: `/uploads/${files.audio[0].filename}`,
        cover: `/uploads/${files.cover[0].filename}`,
        video: files.video?.[0] ? `/uploads/${files.video[0].filename}` : "",
      },
    });

    await event.save();
    return res.status(201).json({
      message: "作品提交成功。",
      parsed,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getSubmissionDetail(req, res) {
  try {
    const event = await eventPopulation(Event.findById(req.params.id));

    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限查看该作品。" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在。" });
    }

    return res.json({
      event: {
        _id: event._id,
        title: event.title,
        scoreFormula: event.scoreFormula,
        activityType: event.activityType,
      },
      submission: buildSubmissionView(event, submission, req.user),
      canScore: canScoreSubmission(event, req.user?._id || req.user?.id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function toggleSubmissionLike(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限操作该作品。" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在。" });
    }

    const liked = (submission.likes || []).some((id) => objectIdEquals(id, req.user._id));
    submission.likes = liked
      ? submission.likes.filter((id) => !objectIdEquals(id, req.user._id))
      : [...submission.likes, req.user._id];

    await event.save();
    return res.json({
      message: liked ? "已取消点赞。" : "已点赞。",
      likesCount: submission.likes.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function addSubmissionComment(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限评论该作品。" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在。" });
    }

    if (!req.body.content?.trim()) {
      return res.status(400).json({ message: "评论内容不能为空。" });
    }

    submission.comments.push({
      author: req.user._id,
      content: req.body.content.trim(),
      anonymous: toBoolean(req.body.anonymous),
    });

    await event.save();
    return res.json({ message: "评论已发布。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function rateSubmission(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!canViewEvent(event, req.user) || !canScoreSubmission(event, req.user._id)) {
      return res.status(403).json({ message: "你当前没有评分权限。" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在。" });
    }

    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ message: "评分必须是 0 到 100 之间的数字。" });
    }

    const existingRating = (submission.ratings || []).find((item) => objectIdEquals(item.author, req.user._id));
    if (existingRating) {
      existingRating.score = score;
      existingRating.anonymous = toBoolean(req.body.anonymous);
    } else {
      submission.ratings.push({
        author: req.user._id,
        score,
        anonymous: toBoolean(req.body.anonymous),
      });
    }

    await event.save();
    return res.json({ message: "评分已保存。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function deleteSubmission(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!isHost(event, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "只有主办可以删除作品。" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在。" });
    }

    Object.values(submission.files || {}).forEach(deleteStoredFile);
    submission.deleteOne();
    await event.save();

    return res.json({ message: "作品已删除。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function downloadSubmissionZip(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限下载该作品。" });
    }

    const submission = event.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "作品不存在。" });
    }

    const safeName = `${submission.title.replace(/[\\/:*?"<>|]/g, "_")}.zip`;
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
    const event = await eventPopulation(Event.findById(req.params.id));
    if (!event) {
      return res.status(404).json({ message: "活动不存在。" });
    }

    if (!canViewEvent(event, req.user)) {
      return res.status(403).json({ message: "没有权限查看参与者信息。" });
    }

    return res.json((event.participants || []).map((participant) => buildParticipantView(event, participant, req.user)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function inviteUser(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    const user = await User.findById(req.body.userId);

    if (!event || !user) {
      return res.status(404).json({ message: "活动或用户不存在。" });
    }

    if (!canManageMembers(event, req.user)) {
      return res.status(403).json({ message: "只有主办或管理员可以邀请用户。" });
    }

    if (isParticipant(event, user._id) || isHost(event, user)) {
      return res.status(400).json({ message: "该用户已经参加该活动。" });
    }

    const exists = await Message.findOne({
      recipient: user._id,
      event: event._id,
      actionType: "event_invitation",
      status: "pending",
    });

    if (exists) {
      return res.status(400).json({ message: "该用户已有待处理邀请。" });
    }

    await createActionMessage({
      recipient: user._id,
      sender: req.user._id,
      event: event._id,
      actionType: "event_invitation",
      title: "你收到了一条活动邀请",
      content: `${req.user.username} 邀请你加入活动「${event.title}」。`,
    });

    return res.json({ message: "邀请已发送。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
