import { Event } from "../models/Event.js";
import { Message } from "../models/Message.js";
import { createNotification } from "../utils/messageHelpers.js";
import { objectIdEquals } from "../utils/eventHelpers.js";

async function ensureEventReminderMessages(user) {
  const today = new Date().toISOString().slice(0, 10);
  const events = await Event.find({
    status: "approved",
    $or: [{ createdBy: user._id }, { participants: user._id }],
  }).select("title startTime endTime");

  const tasks = [];

  for (const event of events) {
    const startDate = new Date(event.startTime).toISOString().slice(0, 10);
    const endDate = new Date(event.endTime).toISOString().slice(0, 10);

    if (startDate === today) {
      const title = `活动开始提醒：${event.title}`;
      const exists = await Message.findOne({ recipient: user._id, event: event._id, title });
      if (!exists) {
        tasks.push(
          createNotification({
            recipient: user._id,
            event: event._id,
            title,
            content: `你关注的活动「${event.title}」今天开始了，记得查看最新进展。`,
          })
        );
      }
    }

    if (endDate === today) {
      const title = `活动结束提醒：${event.title}`;
      const exists = await Message.findOne({ recipient: user._id, event: event._id, title });
      if (!exists) {
        tasks.push(
          createNotification({
            recipient: user._id,
            event: event._id,
            title,
            content: `你关注的活动「${event.title}」今天结束，请记得确认作品与活动状态。`,
          })
        );
      }
    }
  }

  await Promise.all(tasks);
}

export async function getUnreadSummary(req, res) {
  try {
    await ensureEventReminderMessages(req.user);
    const unreadCount = await Message.countDocuments({
      recipient: req.user._id,
      status: { $in: ["unread", "pending"] },
    });

    return res.json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getMessages(req, res) {
  try {
    await ensureEventReminderMessages(req.user);

    await Message.updateMany(
      { recipient: req.user._id, category: "action", status: "unread" },
      { $set: { status: "pending" } }
    );

    const messages = await Message.find({ recipient: req.user._id })
      .populate("sender", "username avatar email bio")
      .populate("event", "title")
      .sort({ createdAt: -1 });

    await Message.updateMany(
      { recipient: req.user._id, category: "notification", status: "unread" },
      { $set: { status: "read" } }
    );

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function respondMessage(req, res) {
  try {
    const { action } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message || !objectIdEquals(message.recipient, req.user._id)) {
      return res.status(404).json({ message: "消息不存在。" });
    }

    if (message.category !== "action" || message.status !== "pending") {
      return res.status(400).json({ message: "这条消息无需处理。" });
    }

    const accepted = action === "accept";
    const rejected = action === "reject";

    if (!accepted && !rejected) {
      return res.status(400).json({ message: "无效的处理操作。" });
    }

    const event = await Event.findById(message.event);
    if (!event) {
      return res.status(404).json({ message: "关联活动不存在。" });
    }

    if (message.actionType === "event_application_review") {
      event.status = accepted ? "approved" : "rejected";
      message.status = accepted ? "accepted" : "rejected";
      await event.save();
      await message.save();

      await createNotification({
        recipient: event.createdBy,
        sender: req.user._id,
        event: event._id,
        title: accepted ? "活动申请审核通过" : "活动申请未通过审核",
        content: accepted
          ? `你申请的活动「${event.title}」已通过审核。`
          : `你申请的活动「${event.title}」未通过审核。`,
      });

      return res.json({ message: accepted ? "已通过活动申请。" : "已拒绝活动申请。" });
    }

    if (message.actionType === "join_request") {
      const joinRequest = event.joinRequests.find(
        (item) =>
          objectIdEquals(item.message, message._id) ||
          objectIdEquals(item.user, message.payload?.applicant)
      );
      if (!joinRequest) {
        return res.status(404).json({ message: "参与申请不存在。" });
      }

      joinRequest.status = accepted ? "accepted" : "rejected";
      message.status = accepted ? "accepted" : "rejected";

      if (accepted && !event.participants.some((id) => objectIdEquals(id, joinRequest.user))) {
        event.participants.push(joinRequest.user);
      }

      await event.save();
      await message.save();

      await createNotification({
        recipient: joinRequest.user,
        sender: req.user._id,
        event: event._id,
        title: accepted ? "活动参与申请已通过" : "活动参与申请被拒绝",
        content: accepted
          ? `你已成功加入活动「${event.title}」。`
          : `你提交到活动「${event.title}」的参与申请未通过。`,
      });

      return res.json({ message: accepted ? "已同意参与申请。" : "已拒绝参与申请。" });
    }

    if (message.actionType === "event_invitation") {
      const alreadyParticipant = event.participants.some((id) => objectIdEquals(id, req.user._id));
      message.status = accepted ? "accepted" : "rejected";

      if (accepted && !alreadyParticipant) {
        event.participants.push(req.user._id);
      }

      await event.save();
      await message.save();

      await createNotification({
        recipient: event.createdBy,
        sender: req.user._id,
        event: event._id,
        title: accepted ? "活动邀请已接受" : "活动邀请已拒绝",
        content: `${req.user.username}${accepted ? "接受了" : "拒绝了"}你发出的活动邀请。`,
      });

      return res.json({ message: accepted ? "已接受邀请。" : "已拒绝邀请。" });
    }

    return res.status(400).json({ message: "暂不支持处理该类型消息。" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
