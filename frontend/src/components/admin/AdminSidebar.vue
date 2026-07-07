<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ExternalLink, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import logo from '@/assets/images/logo.png'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navItems = [
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/gallery', label: 'Gallery' },
  { to: '/admin/orders', label: 'Orders' },
]

const isActive = (item) => route.path === item.to

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <!-- Sidebar gelap ala panel admin: logo di atas, menu di bawahnya -->
  <aside
    class="hidden md:flex w-60 shrink-0 flex-col bg-cocoa-900 text-cream-100 sticky top-0 h-screen px-4 py-6"
  >
    <RouterLink to="/admin/analytics" class="flex items-center gap-3 px-2">
      <span class="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
        <img :src="logo" alt="Talita's Cake" class="w-9 h-9 object-contain" />
      </span>
      <span class="flex flex-col leading-tight">
        <span class="font-display text-lg text-cream-50">Talita's Cake</span>
        <span class="text-[10px] font-sans font-bold tracking-[0.22em] uppercase text-brand-300">
          Admin Panel
        </span>
      </span>
    </RouterLink>

    <hr class="border-white/10 my-6" />

    <nav class="space-y-1.5">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="block px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        :class="
          isActive(item)
            ? 'bg-brand-500 text-white shadow-[0_6px_16px_-6px_rgba(185,58,60,0.7)]'
            : 'text-cream-200/80 hover:text-cream-50 hover:bg-white/5'
        "
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <!-- Tautan bantu di bawah: kembali ke situs publik & keluar -->
    <div class="mt-auto pt-6 border-t border-white/10 space-y-1">
      <RouterLink
        to="/"
        class="flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm text-cream-200/70 hover:text-cream-50 hover:bg-white/5 transition-colors"
      >
        <ExternalLink class="w-4 h-4" stroke-width="1.8" />
        View site
      </RouterLink>
      <button
        type="button"
        @click="handleLogout"
        class="w-full flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm text-cream-200/70 hover:text-white hover:bg-brand-500/80 transition-colors text-left"
      >
        <LogOut class="w-4 h-4" stroke-width="1.8" />
        Logout
      </button>
    </div>
  </aside>

  <!-- Versi mobile: bar gelap di atas dengan menu yang bisa digeser -->
  <div class="md:hidden bg-cocoa-900 text-cream-100 px-4 pt-4 pb-3 sticky top-0 z-40">
    <div class="flex items-center gap-3">
      <span class="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
        <img :src="logo" alt="Talita's Cake" class="w-7 h-7 object-contain" />
      </span>
      <span class="flex flex-col leading-tight">
        <span class="font-display text-base text-cream-50">Talita's Cake</span>
        <span class="text-[9px] font-sans font-bold tracking-[0.22em] uppercase text-brand-300">
          Admin Panel
        </span>
      </span>
      <button
        type="button"
        @click="handleLogout"
        class="ml-auto p-2 rounded-lg text-cream-200/70 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Logout"
      >
        <LogOut class="w-4 h-4" stroke-width="1.8" />
      </button>
    </div>

    <nav class="flex gap-1.5 mt-3 overflow-x-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
        :class="
          isActive(item)
            ? 'bg-brand-500 text-white'
            : 'text-cream-200/80 hover:text-cream-50 hover:bg-white/5'
        "
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
