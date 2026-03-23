import { Message } from "../models/Message.js";

export async function markAllMessagesRead(req, res) {
  try {
    await Message.updateMany(
      {
        recipient: req.user._id,
        category: "notification",
        status: "unread",
      },
      { $set: { status: "read" } }
    );

    return res.json({ message: "已将所有通知标记为已读" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function deleteMessage(req, res) {
  try {
    const message = await Message.findById(req.params.id);

    if (!message || message.recipient.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "消息不存在" });
    }

    await message.deleteOne();
    return res.json({ message: "消息已删除" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
