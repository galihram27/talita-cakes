// src/stores/auth.store.js
import { defineStore } from "pinia";
import api from "@/lib/api";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: null, // in-memory saja, JANGAN simpan ke localStorage
    user: null, // { id, name, email, role }
    isReady: false, // true setelah restoreSession() selesai (sekali saat app load)
    _restorePromise: null, // guard supaya restoreSession tidak jalan dobel
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === "ADMIN",
  },

  actions: {
    setAccessToken(token) {
      this.accessToken = token;
    },

    setUser(user) {
      this.user = user;
    },

    clearSession() {
      this.accessToken = null;
      this.user = null;
    },

    // Dipanggil saat login sukses / verify email sukses
    handleAuthSuccess({ accessToken, user }) {
      this.accessToken = accessToken;
      this.user = user;
    },

    // Register step 1: kirim data akun, backend balas dengan kirim OTP ke email.
    // Belum login di sini — login baru terjadi setelah verify email sukses.
    async register(payload) {
      const { data } = await api.post("/auth/register", payload);
      return data;
    },

    async login(credentials) {
      const { data } = await api.post("/auth/login", credentials);
      this.handleAuthSuccess(data.data);
      return data;
    },

    async logout() {
      try {
        await api.post("/auth/logout");
      } finally {
        this.clearSession();
      }
    },

    // Dipanggil sekali saat app pertama kali load (App.vue -> onMounted / router guard)
    // Coba pulihkan sesi dari refresh token cookie httpOnly
    async restoreSession() {
      // Kalau sudah pernah/ sedang jalan, pakai promise yang sama (hindari request dobel)
      if (this._restorePromise) return this._restorePromise;
      this._restorePromise = this._doRestoreSession();
      return this._restorePromise;
    },

    async _doRestoreSession() {
      try {
        // 1. Tukar refresh token (cookie httpOnly) dengan access token baru
        const { data: refreshData } = await api.post("/auth/refresh-token");
        this.accessToken = refreshData.data.accessToken;

        // 2. Pakai access token itu buat ambil data user
        const { data: meData } = await api.get("/auth/me");
        this.user = meData.data.user;
      } catch (err) {
        this.clearSession(); // gak ada sesi valid (guest, atau refresh token expired)
      } finally {
        this.isReady = true;
      }
    },
  },
});
