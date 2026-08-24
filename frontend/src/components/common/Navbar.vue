<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ShoppingCart, ChevronDown, User, LogOut, Menu, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import { setLocale } from '@/i18n'
import MiniCart from '@/components/common/MiniCart.vue'
import logo from '@/assets/images/logo.png'

/**
 * Bar navigasi atas, tampil di semua halaman publik.
 *
 * Susunannya berubah menurut lebar layar: di layar besar semua tautan
 * berderet, di layar kecil disembunyikan ke balik tombol tiga garis.
 */

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const cartStore = useCartStore()

const switchLocale = (lang) => setLocale(lang)

// Pindah halaman -> tutup ringkasan keranjang, biar tidak menggantung
watch(
  () => route.fullPath,
  () => cartStore.closeMini()
)

// Ikon keranjang "memantul" sebentar tiap kali ada barang masuk, sebagai
// penanda bahwa klik tadi berhasil.
const isCartBumping = ref(false)
watch(
  () => cartStore.count,
  (newCount, oldCount) => {
    if (newCount > oldCount) {
      // Dimatikan dulu lalu dinyalakan lagi di frame berikutnya. Tanpa jeda
      // ini, penambahan kedua tidak memantul karena animasinya dianggap
      // masih berjalan.
      isCartBumping.value = false
      requestAnimationFrame(() => (isCartBumping.value = true))
    }
  }
)

// Dua hal yang bisa dibuka-tutup: menu akun dan menu geser di layar kecil
const isUserMenuOpen = ref(false)
const isNavOpen = ref(false)
const toggleUserMenu = () => (isUserMenuOpen.value = !isUserMenuOpen.value)
const closeUserMenu = () => (isUserMenuOpen.value = false)
const toggleNav = () => (isNavOpen.value = !isNavOpen.value)
const closeNav = () => (isNavOpen.value = false)

// Huruf awal nama dipakai sebagai pengganti foto profil
const userInitial = () =>
  (authStore.user?.name || '?').trim().charAt(0).toUpperCase()
// Nama depan saja, supaya tidak memakan tempat di bar
const userFirst = () => (authStore.user?.name || '').trim().split(' ')[0]

const handleLogout = async () => {
  closeUserMenu()
  closeNav()
  await authStore.logout()
}

// Daftar tautan. Dibungkus computed supaya labelnya ikut berubah saat
// bahasa diganti. `exact` menandai Beranda, yang jika tidak dibedakan akan
// tampak aktif di semua halaman karena alamatnya "/".
const navLinks = computed(() => [
  { to: '/', label: t('nav.home'), exact: true },
  { to: '/menu', label: t('nav.menu') },
  { to: '/gallery', label: t('nav.gallery') },
  { to: '/about', label: t('nav.about') },
  { to: '/faq', label: t('nav.faq') },
])
</script>

<template>
  <header
    class="sticky top-0 z-50 bg-[#FDF2F7]/90 backdrop-blur-md border-b border-[#F5DCE8]"
  >
    <div
      class="max-w-[1440px] mx-auto flex items-center gap-3 md:gap-7 px-5 md:px-8 lg:px-12 h-[72px]"
    >
      <!-- Logo + nama toko, sekaligus tautan ke beranda -->
      <RouterLink
        to="/"
        class="flex items-center gap-2 md:gap-3 min-w-0 text-cocoa-900 hover:opacity-70 transition-opacity"
        @click="closeNav"
      >
        <img
          :src="logo"
          alt="Talita's Cake & Cupcakes"
          class="h-[38px] w-[38px] md:h-[46px] md:w-[46px] object-contain shrink-0"
        />
        <span class="flex flex-col leading-tight">
          <span class="font-display text-[15px] md:text-[19px] leading-[1.15]"
            >Talita's Cake<br class="md:hidden" /> &amp; Cupcakes</span
          >
          <span
            class="text-[9px] md:text-[10.5px] tracking-[0.14em] uppercase text-cocoa-400"
          >
            {{ t('nav.since') }}
          </span>
        </span>
      </RouterLink>

      <!-- Tautan halaman, hanya tampil mulai layar sedang ke atas -->
      <nav
        class="hidden md:flex items-center gap-2 mx-auto text-[15px] font-semibold"
      >
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="px-3 py-1.5 rounded-full text-cocoa-900 hover:text-cocoa-500 hover:bg-white/50 transition-colors"
          :exact-active-class="'text-brand-500 bg-brand-100'"
          :active-class="link.exact ? undefined : 'text-brand-500 bg-brand-100'"
        >
          {{ link.label }}
        </RouterLink>
        <RouterLink
          v-if="authStore.isAdmin"
          to="/admin/analytics"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-brand-500 hover:bg-brand-100 transition-colors"
        >
          🛠 {{ t('nav.admin') }}
        </RouterLink>
      </nav>

      <!-- Sisi kanan: ganti bahasa, keranjang, akun, dan tombol menu -->
      <div class="flex items-center gap-2 md:gap-2.5 ml-auto md:ml-2 shrink-0">
        <!-- Ganti bahasa ID / EN -->
        <div
          class="hidden sm:inline-flex items-center h-[42px] p-1 rounded-full bg-white border border-[#EBDCCC] text-[12px] font-extrabold"
        >
          <button
            type="button"
            @click="switchLocale('id')"
            class="px-2.5 h-[32px] rounded-full transition-colors"
            :class="
              locale === 'id'
                ? 'bg-brand-500 text-white'
                : 'text-cocoa-400 hover:text-cocoa-900'
            "
          >
            ID
          </button>
          <button
            type="button"
            @click="switchLocale('en')"
            class="px-2.5 h-[32px] rounded-full transition-colors"
            :class="
              locale === 'en'
                ? 'bg-brand-500 text-white'
                : 'text-cocoa-400 hover:text-cocoa-900'
            "
          >
            EN
          </button>
        </div>

        <!-- Ikon keranjang + jumlah barang. Diklik untuk membuka ringkasannya. -->
        <div class="relative">
          <button
            type="button"
            :title="t('nav.cart')"
            :aria-expanded="cartStore.isMiniOpen"
            @click="cartStore.toggleMini()"
            class="relative inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white border text-cocoa-900 hover:border-brand-500 hover:bg-brand-100 hover:text-brand-500 transition-colors"
            :class="cartStore.isMiniOpen ? 'border-brand-500 bg-brand-100 text-brand-500' : 'border-[#EBDCCC]'"
          >
            <ShoppingCart
              class="w-5 h-5"
              :class="{ 'tc-cart-bump': isCartBumping }"
              stroke-width="1.7"
            />
            <span
              v-if="cartStore.count > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[11px] font-extrabold flex items-center justify-center"
              :class="{ 'tc-cart-bump': isCartBumping }"
            >
              {{ cartStore.count }}
            </span>
          </button>

          <MiniCart />
        </div>

        <!-- Belum login: tombol masuk -->
        <RouterLink
          v-if="!authStore.isAuthenticated"
          to="/login"
          class="hidden md:inline-flex items-center h-[42px] px-5 rounded-full bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors"
        >
          {{ t('nav.signIn') }}
        </RouterLink>

        <!-- Sudah login: nama + menu akun -->
        <div v-else class="relative hidden md:block">
          <button
            type="button"
            @click="toggleUserMenu"
            class="inline-flex items-center gap-2 h-[42px] px-4 rounded-full bg-white border border-[#EBDCCC] text-cocoa-900 text-sm font-bold hover:border-brand-500 transition-colors"
          >
            <span
              class="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-extrabold"
            >
              {{ userInitial() }}
            </span>
            <span class="hidden sm:inline">{{ userFirst() }}</span>
            <ChevronDown
              class="w-3.5 h-3.5 transition-transform"
              :class="isUserMenuOpen ? 'rotate-180' : ''"
              stroke-width="2.4"
            />
          </button>

          <div
            v-if="isUserMenuOpen"
            class="absolute right-0 top-[calc(100%+8px)] min-w-[168px] bg-white border border-[#EBDCCC] rounded-2xl shadow-[0_14px_34px_-12px_rgba(51,38,31,0.35)] p-1.5 z-[60] overflow-hidden"
          >
            <RouterLink
              to="/profile"
              class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-cocoa-900 text-sm font-bold hover:bg-[#F7EEE6] transition-colors"
              @click="closeUserMenu"
            >
              <User class="w-4 h-4" stroke-width="1.8" />
              {{ t('nav.profile') }}
            </RouterLink>
            <button
              type="button"
              @click="handleLogout"
              class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-brand-500 text-sm font-bold text-left hover:bg-brand-50 transition-colors"
            >
              <LogOut class="w-4 h-4" stroke-width="1.8" />
              {{ t('nav.logout') }}
            </button>
          </div>
        </div>

        <!-- Tombol tiga garis, pengganti deretan tautan di layar kecil -->
        <button
          type="button"
          @click="toggleNav"
          class="inline-flex md:hidden items-center justify-center w-[42px] h-[42px] rounded-full bg-white border border-[#EBDCCC] hover:border-brand-500 hover:bg-brand-100 transition-colors"
          :aria-expanded="isNavOpen"
        >
          <component
            :is="isNavOpen ? X : Menu"
            class="w-5 h-5 transition-transform duration-200"
            stroke-width="1.7"
          />
        </button>
      </div>
    </div>

    <!-- Menu layar kecil, menggeser masuk dari kanan -->
    <div class="md:hidden absolute left-0 right-0 top-full overflow-x-hidden z-40">
      <Transition name="nav-slide">
        <nav
          v-if="isNavOpen"
          class="flex flex-col border-t border-[#F5DCE8] bg-[#FDF2F7] shadow-[0_16px_30px_-16px_rgba(51,38,31,0.4)] px-5 pt-2 pb-4"
        >
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="py-3 px-2 text-cocoa-900 font-bold border-b border-[#F5DCE8] hover:text-brand-500 transition-colors"
            @click="closeNav"
          >
            {{ link.label }}
          </RouterLink>
          <RouterLink
            v-if="authStore.isAdmin"
            to="/admin/analytics"
            class="py-3 px-2 text-brand-500 font-extrabold hover:opacity-70 transition-opacity"
            @click="closeNav"
          >
            🛠 {{ t('nav.adminPanel') }}
          </RouterLink>

          <!-- Tombol akun versi layar kecil -->
          <RouterLink
            v-if="!authStore.isAuthenticated"
            to="/login"
            class="mt-3 inline-flex items-center justify-center h-[44px] px-5 rounded-full bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors"
            @click="closeNav"
          >
            {{ t('nav.signIn') }}
          </RouterLink>
          <template v-else>
            <RouterLink
              to="/profile"
              class="flex items-center gap-2.5 py-3 px-2 text-cocoa-900 font-bold border-b border-[#F5DCE8] hover:text-brand-500 transition-colors"
              @click="closeNav"
            >
              <User class="w-4 h-4" stroke-width="1.8" />
              {{ t('nav.profile') }}
            </RouterLink>
            <button
              type="button"
              @click="handleLogout"
              class="flex items-center gap-2.5 py-3 px-2 text-left text-brand-500 font-bold hover:opacity-70 transition-opacity"
            >
              <LogOut class="w-4 h-4" stroke-width="1.8" />
              {{ t('nav.logout') }}
            </button>
          </template>

          <!-- Ganti bahasa versi layar kecil -->
          <div class="flex items-center gap-2 pt-3 sm:hidden">
            <button
              type="button"
              @click="switchLocale('id')"
              class="px-4 py-1.5 rounded-full text-[12px] font-extrabold border transition-colors"
              :class="
                locale === 'id'
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white border-[#EBDCCC] text-cocoa-400'
              "
            >
              ID
            </button>
            <button
              type="button"
              @click="switchLocale('en')"
              class="px-4 py-1.5 rounded-full text-[12px] font-extrabold border transition-colors"
              :class="
                locale === 'en'
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white border-[#EBDCCC] text-cocoa-400'
              "
            >
              EN
            </button>
          </div>
        </nav>
      </Transition>
    </div>
  </header>

  <!-- Lapisan tak terlihat yang menutupi halaman selagi ringkasan keranjang
       terbuka: klik di mana pun akan menutupnya. Sengaja diletakkan di luar
       <header> dan diberi lapisan lebih rendah, supaya header dan panel
       keranjangnya sendiri tetap bisa diklik. -->
  <div
    v-if="cartStore.isMiniOpen"
    class="fixed inset-0 z-40"
    @click="cartStore.closeMini()"
  ></div>
</template>

<style scoped>
/* Menu layar kecil masuk dengan menggeser dari tepi kanan.
   overflow: hidden menahan isinya supaya tidak sempat terlihat melewati
   tepi layar selagi bergeser. */
.nav-slide-enter-active,
.nav-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
}
.nav-slide-enter-from,
.nav-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.nav-slide-enter-to,
.nav-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
</style>
