import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import EventApplyView from "../views/EventApplyView.vue";
import EventDetailView from "../views/EventDetailView.vue";
import EventSubmitView from "../views/EventSubmitView.vue";
import EventsView from "../views/EventsView.vue";
import ForumView from "../views/ForumView.vue";
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import MessagesView from "../views/MessagesView.vue";
import PostDetailView from "../views/PostDetailView.vue";
import ProfileAvatarView from "../views/ProfileAvatarView.vue";
import ProfileView from "../views/ProfileView.vue";
import RegisterView from "../views/RegisterView.vue";
import AdminUsersView from "../views/AdminUsersView.vue";
import SubmissionDetailView from "../views/SubmissionDetailView.vue";
import UserProfileView from "../views/UserProfileView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView },
    { path: "/login", component: LoginView },
    { path: "/register", component: RegisterView },
    { path: "/events", component: EventsView },
    { path: "/events/apply", component: EventApplyView, meta: { requiresAuth: true } },
    { path: "/events/:id", component: EventDetailView },
    { path: "/events/:id/submit", component: EventSubmitView, meta: { requiresAuth: true } },
    { path: "/events/:id/submissions/:submissionId", component: SubmissionDetailView },
    { path: "/forum", component: ForumView },
    { path: "/forum/:id", component: PostDetailView },
    { path: "/messages", component: MessagesView, meta: { requiresAuth: true } },
    { path: "/profile", component: ProfileView, meta: { requiresAuth: true } },
    { path: "/profile/avatar", component: ProfileAvatarView, meta: { requiresAuth: true } },
    { path: "/admin/users", component: AdminUsersView, meta: { requiresAuth: true } },
    { path: "/users/:id", component: UserProfileView },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
    await authStore.fetchMe();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return "/login";
  }

  return true;
});

export default router;
