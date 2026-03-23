import { Event } from "../models/Event.js";
import { User } from "../models/User.js";
import { DEFAULT_AVATAR } from "../utils/defaultAvatar.js";

function profileUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar || DEFAULT_AVATAR,
    showParticipatedEvents: user.showParticipatedEvents,
    createdAt: user.createdAt,
  };
}

export async function searchUsers(req, res) {
  try {
    const keyword = (req.query.keyword || "").trim();

    if (!keyword) {
      return res.json([]);
    }

    const users = await User.find({
      username: { $regex: keyword, $options: "i" },
    })
      .select("username avatar bio email")
      .limit(8);

    return res.json(
      users.map((user) => ({
        id: user._id,
        username: user.username,
        avatar: user.avatar || DEFAULT_AVATAR,
        bio: user.bio,
        email: user.email,
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getUserProfile(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "用户不存在" });
    }

    const isSelf = req.user?._id?.toString() === user._id.toString();
    const participatedQuery = {
      status: "approved",
      participants: user._id,
    };

    const [hostedEvents, participatedEvents] = await Promise.all([
      Event.find({ createdBy: user._id, status: "approved" })
        .select("title summary bannerImage startTime endTime createdBy")
        .populate("createdBy", "username avatar email bio")
        .sort({ createdAt: -1 }),
      isSelf || user.showParticipatedEvents
        ? Event.find(participatedQuery)
            .select("title summary bannerImage startTime endTime createdBy")
            .populate("createdBy", "username avatar email bio")
            .sort({ createdAt: -1 })
        : [],
    ]);

    return res.json({
      user: profileUser(user),
      hostedEvents,
      participatedEvents,
      canViewParticipatedEvents: isSelf || user.showParticipatedEvents,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
