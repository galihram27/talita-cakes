<script setup>
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Image,
  ClipboardList,
} from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { to: '/admin/analytics', label: 'Admin Panel', icon: LayoutDashboard, activeMatch: null },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, activeMatch: '/admin/analytics' },
  { to: '/admin/products', label: 'Products', icon: Package, activeMatch: '/admin/products' },
  { to: '/admin/gallery', label: 'Gallery', icon: Image, activeMatch: '/admin/gallery' },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, activeMatch: '/admin/orders' },
]

const isActive = (item) => item.activeMatch && route.path === item.activeMatch
</script>

<template>
  <aside class="hidden md:block w-52 shrink-0">
    <nav class="space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.label"
        :to="item.to"
        class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition"
        :class="
          isActive(item)
            ? 'bg-brand-50 text-brand-700 font-semibold'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        "
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>
