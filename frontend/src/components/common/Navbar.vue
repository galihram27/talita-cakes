<script setup>
import { ref } from "vue";
import { ShoppingCart, CircleUserRound } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth.store";
import logo from "@/assets/images/logo.jpeg";

const authStore = useAuthStore();

const isMenuOpen = ref(false);
const toggleMenu = () => (isMenuOpen.value = !isMenuOpen.value);
const closeMenu = () => (isMenuOpen.value = false);

const handleLogout = async () => {
  closeMenu();
  await authStore.logout();
};
</script>

<template>
  <header class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-2.5">
        <img
          :src="logo"
          alt="Logo Talita's Cake & Cupcakes"
          class="h-10 w-10 rounded-full object-cover"
        />
        <span class="text-xl font-extrabold tracking-tight text-brand-600">
          Talita's Cake &amp; Cupcakes
        </span>
      </RouterLink>

      <!-- Nav links -->
      <nav
        class="hidden md:flex items-center gap-8 text-base font-medium text-gray-700"
      >
        <RouterLink
          to="/"
          class="hover:text-brand-600 transition-colors"
          exact-active-class="text-brand-600 font-semibold"
        >
          Home
        </RouterLink>
        <RouterLink
          to="/menu"
          class="hover:text-brand-600 transition-colors"
          active-class="text-brand-600 font-semibold"
        >
          Menu
        </RouterLink>
        <RouterLink
          to="/gallery"
          class="hover:text-brand-600 transition-colors"
          active-class="text-brand-600 font-semibold"
        >
          Gallery
        </RouterLink>
        <RouterLink
          to="/about"
          class="hover:text-brand-600 transition-colors"
          active-class="text-brand-600 font-semibold"
        >
          About Us
        </RouterLink>
        <RouterLink
          v-if="authStore.isAdmin"
          to="/admin/analytics"
          class="hover:text-brand-600 transition-colors"
        >
          Admin
        </RouterLink>
      </nav>

      <!-- Right side -->
      <div class="flex items-center gap-4">
        <RouterLink to="/cart" class="relative hover:text-brand-600 transition-colors">
          <ShoppingCart class="w-5 h-5" />
        </RouterLink>

        <!-- GUEST -->
        <RouterLink
          v-if="!authStore.isAuthenticated"
          to="/login"
          class="rounded-full border border-brand-600 text-brand-600 px-5 py-2 text-sm font-semibold hover:bg-brand-600 hover:text-white transition"
        >
          Login
        </RouterLink>

        <!-- LOGGED IN: icon user + nama, dengan dropdown logout -->
        <div v-else class="relative">
          <button
            type="button"
            @click="toggleMenu"
            class="flex items-center gap-2 text-sm font-medium hover:text-gray-900"
          >
            <CircleUserRound class="w-6 h-6" />
            <span class="hidden sm:inline">{{ authStore.user?.name }}</span>
          </button>

          <div
            v-if="isMenuOpen"
            class="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50"
            @click.away="closeMenu"
          >
            <RouterLink
              to="/profile"
              class="block px-4 py-2 text-sm hover:bg-gray-100"
              @click="closeMenu"
            >
              Profile
            </RouterLink>
            <button
              type="button"
              @click="handleLogout"
              class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
