import { Message } from "../models/Message.js";

export async function createNotification({ recipient, sender = null, event = null, title, content }) {
  return Message.create({
    category: "notification",
    actionType: "none",
    recipient,
    sender,
    event,
    title,
    content,
    status: "unread",
  });
}

export async function createActionMessage({
  recipient,
  sender = null,
  event = null,
  title,
  content,
  actionType,
  payload = {},
}) {
  return Message.create({
    category: "action",
    actionType,
    recipient,
    sender,
    event,
    title,
    content,
    payload,
    status: "pending",
  });
}
