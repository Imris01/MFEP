import { User } from "../models/User.js";

export async function getUsers(_req, res) {
  try {
    const users = await User.find().select("username email avatar bio role createdAt").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "角色无效" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select(
      "username email avatar bio role createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "用户不存在" });
    }

    return res.json({ message: "用户角色已更新", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
