import { defineStore } from "pinia";
import http from "../api/http";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    token: localStorage.getItem("mfep_token") || "",
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async register(payload) {
      this.loading = true;
      try {
        const { data } = await http.post("/auth/register", payload);
        this.setSession(data);
      } finally {
        this.loading = false;
      }
    },
    async login(payload) {
      this.loading = true;
      try {
        const { data } = await http.post("/auth/login", payload);
        this.setSession(data);
      } finally {
        this.loading = false;
      }
    },
    async fetchMe() {
      if (!this.token) {
        return;
      }

      try {
        const { data } = await http.get("/auth/me");
        this.user = data.user;
      } catch (_error) {
        this.logout(false);
      }
    },
    async updateProfile(payload) {
      const { data } = await http.put("/auth/profile", payload, {
        headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
      });
      this.user = data.user;
      return data;
    },
    async logout(callApi = true) {
      if (callApi && this.token) {
        try {
          await http.post("/auth/logout");
        } catch (_error) {
          // Ignore logout API failures and clear local session anyway.
        }
      }

      this.user = null;
      this.token = "";
      localStorage.removeItem("mfep_token");
    },
    setSession(data) {
      this.user = data.user;
      this.token = data.token;
      localStorage.setItem("mfep_token", data.token);
    },
  },
});
