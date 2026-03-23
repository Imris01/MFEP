# Maimai Fanmade Event Platform

一个基于 Vue 3、Express 和 MongoDB 的全栈项目骨架，面向 maimai 同好社区的活动企划、作品投稿与论坛交流场景。

## 当前能力

- 全站主要提示信息已切换为中文
- 顶部导航栏包含主页、活动、论坛、个人主页、登录/登出，并支持悬停下拉菜单
- 页面下滑后显示“回到顶部”按钮
- 主页展示最近的新活动和论坛新帖子
- 用户系统支持注册、登录、个人描述、本地头像上传、默认头像、活动参与记录公开设置
- 活动系统支持：
  - 申请开办活动并上传活动头图
  - 管理员审核活动申请
  - 活动公开或私密设置
  - 普通用户提交参与申请，主办审核后加入
  - 主办邀请用户参与
  - 主办编辑、删除活动，查看参与者详情
  - 已参赛用户提交作品、退出活动
  - 作品展示标题、封面、谱师名义、简介
- 消息中心支持通知消息和待处理消息
- 论坛支持发帖、评论和 Markdown 渲染

## 启动方式

1. 安装依赖

```bash
npm install
npm install --prefix server
npm install --prefix client
```

2. 配置环境变量

将 [server/.env.example](/D:/CodeProject/MFEP/server/.env.example) 复制为 `server/.env`，并配置 MongoDB 连接与 JWT 密钥。

3. 启动开发环境

```bash
npm run dev
```

- 前端默认地址：`http://localhost:5173`
- 后端默认地址：`http://localhost:5000`

## 说明

- 默认头像静态资源位于 [server/public/defaults/avatar-default.svg](/D:/CodeProject/MFEP/server/public/defaults/avatar-default.svg)
- 上传文件保存在 `server/uploads`
- 活动开始和结束提醒当前会在打开消息中心时按日期自动生成
