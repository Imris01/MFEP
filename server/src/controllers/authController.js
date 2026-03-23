import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { DEFAULT_AVATAR } from "../utils/defaultAvatar.js";
import { generateToken } from "../utils/generateToken.js";

function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar || DEFAULT_AVATAR,
    role: user.role,
    showParticipatedEvents: user.showParticipatedEvents,
    createdAt: user.createdAt,
  };
}

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "请输入用户名、邮箱和密码" });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "用户名或邮箱已被使用" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: DEFAULT_AVATAR,
    });

    return res.status(201).json({
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(400).json({ message: "邮箱或密码错误" });
    }

    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      return res.status(400).json({ message: "邮箱或密码错误" });
    }

    return res.json({
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function logout(_req, res) {
  return res.json({ message: "已退出登录" });
}

export async function getCurrentUser(req, res) {
  return res.json({ user: sanitizeUser(req.user) });
}

export async function updateProfile(req, res) {
  try {
    const { bio, showParticipatedEvents } = req.body;
    const updates = {
      bio: bio ?? req.user.bio,
    };

    if (typeof showParticipatedEvents !== "undefined") {
      updates.showParticipatedEvents = String(showParticipatedEvents) === "true";
    }

    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");

    return res.json({
      message: "个人资料更新成功",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
