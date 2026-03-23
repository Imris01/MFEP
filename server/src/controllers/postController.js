import { Post } from "../models/Post.js";

function summarize(content) {
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

function buildThread(post) {
  const postObject = post.toObject ? post.toObject() : post;
  const rootComments = postObject.comments
    .filter((comment) => !comment.parentComment)
    .map((comment) => ({
      ...comment,
      replies: postObject.comments.filter(
        (reply) => reply.parentComment?.toString() === comment._id.toString()
      ),
    }));

  return {
    ...postObject,
    summary: summarize(postObject.content),
    comments: rootComments,
  };
}

export async function createPost(req, res) {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "请输入帖子标题和内容" });
    }

    const post = await Post.create({
      title,
      content,
      author: req.user._id,
    });

    const populated = await Post.findById(post._id).populate("author", "username avatar email bio");
    return res.status(201).json(buildThread(populated));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getPosts(_req, res) {
  try {
    const posts = await Post.find()
      .populate("author", "username avatar email bio")
      .sort({ createdAt: -1 });

    return res.json(
      posts.map((post) => ({
        _id: post._id,
        title: post.title,
        author: post.author,
        summary: summarize(post.content),
        createdAt: post.createdAt,
        likesCount: post.likes.length,
        commentsCount: post.comments.filter((comment) => !comment.parentComment).length,
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getPostById(req, res) {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username avatar email bio")
      .populate("comments.author", "username avatar email bio")
      .populate("comments.replyToUser", "username avatar");

    if (!post) {
      return res.status(404).json({ message: "帖子不存在" });
    }

    return res.json(buildThread(post));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function addComment(req, res) {
  try {
    const { content, parentCommentId, replyToUserId } = req.body;

    if (!content) {
      return res.status(400).json({ message: "评论内容不能为空" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "帖子不存在" });
    }

    if (parentCommentId) {
      const exists = post.comments.some((comment) => comment._id.toString() === parentCommentId);
      if (!exists) {
        return res.status(404).json({ message: "楼层不存在" });
      }
    }

    post.comments.push({
      author: req.user._id,
      content,
      parentComment: parentCommentId || null,
      replyToUser: replyToUserId || null,
    });

    await post.save();

    const populated = await Post.findById(req.params.id)
      .populate("author", "username avatar email bio")
      .populate("comments.author", "username avatar email bio")
      .populate("comments.replyToUser", "username avatar");

    return res.status(201).json(buildThread(populated));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function togglePostLike(req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "帖子不存在" });
    }

    const liked = post.likes.some((id) => id.toString() === req.user._id.toString());
    post.likes = liked
      ? post.likes.filter((id) => id.toString() !== req.user._id.toString())
      : [...post.likes, req.user._id];

    await post.save();

    return res.json({ likesCount: post.likes.length, liked: !liked });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function toggleCommentLike(req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "帖子不存在" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "评论不存在" });
    }

    const liked = comment.likes.some((id) => id.toString() === req.user._id.toString());
    comment.likes = liked
      ? comment.likes.filter((id) => id.toString() !== req.user._id.toString())
      : [...comment.likes, req.user._id];

    await post.save();

    return res.json({ likesCount: comment.likes.length, liked: !liked });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
