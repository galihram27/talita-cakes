// src/stores/auth.store.js
import { defineStore } from 'pinia'
import api from '@/lib/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null, // in-memory saja, JANGAN simpan ke localStorage
    user: null,         // { id, name, email, role }
    isReady: false,      // true setelah restoreSession() selesai (sekali saat app load)
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'ADMIN',
  },

  actions: {
    setAccessToken(token) {
      this.accessToken = token
    },

    setUser(user) {
      this.user = user
    },

    clearSession() {
      this.accessToken = null
      this.user = null
    },

    // Dipanggil saat login sukses / verify email sukses
    handleAuthSuccess({ accessToken, user }) {
      this.accessToken = accessToken
      this.user = user
    },

    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials)
      this.handleAuthSuccess(data.data)
      return data
    },

    async logout() {
      try {
        await api.post('/auth/logout')
      } finally {
        this.clearSession()
      }
    },

    // Dipanggil sekali saat app pertama kali load (App.vue -> onMounted)
    // Coba pulihkan sesi dari refresh token cookie httpOnly
    async restoreSession() {
      try {
        const { data } = await api.get('/auth/me')
        this.user = data.data.user
        this.accessToken = data.data.accessToken // kalau /auth/me juga mengembalikan token baru
      } catch (err) {
        this.clearSession() // gak ada sesi valid, biarkan jadi guest
      } finally {
        this.isReady = true
      }
    },
  },
})