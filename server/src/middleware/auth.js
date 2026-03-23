import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "请先登录" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "用户不存在" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "登录状态已失效，请重新登录" });
  }
}
