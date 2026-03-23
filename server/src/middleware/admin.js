export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "只有管理员可以执行此操作" });
  }

  next();
}
