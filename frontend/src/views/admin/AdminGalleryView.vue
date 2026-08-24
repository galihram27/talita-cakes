<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { deleteGallery } from '@/services/gallery.service'
import { getSetting, updateSetting } from '@/services/settings.service'
import { uploadImage } from '@/services/upload.service'
import { cloudinaryThumb } from '@/utils/cloudinaryImage'
import { useGalleryStore } from '@/stores/gallery.store'
import { useAdminGalleryStore } from '@/stores/adminGallery.store'
import { useAnalyticsStore } from '@/stores/analytics.store'
import GalleryFormModal from '@/components/admin/GalleryFormModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Toast from '@/components/common/Toast.vue'

const { t } = useI18n()
const adminGalleryStore = useAdminGalleryStore()
const analyticsStore = useAnalyticsStore()

const errorMessage = ref('')
const toastMessage = ref('')
const searchQuery = ref(adminGalleryStore.search)
const isLoadingMore = ref(false)

const galleryItems = computed(() => adminGalleryStore.items)
const totalItems = computed(() => adminGalleryStore.totalItems)
const isLoading = computed(() => !adminGalleryStore.hasLoaded && !errorMessage.value)

// Penampung timer untuk menunda pencarian, dijelaskan di handleSearchInput.
let searchDebounceTimer = null

// Bagian atas halaman untuk mengganti foto besar di beranda. Datanya disimpan
// sebagai pengaturan bernama "hero-image", terpisah dari daftar galeri.
const heroImageUrl = ref('')
const heroUploading = ref(false)
const heroError = ref('')
// Menunjuk ke <input type="file"> yang disembunyikan di template.
const heroFileInput = ref(null)

const loadHeroImage = async () => {
  try {
    heroImageUrl.value = (await getSetting('hero-image')) || ''
  } catch {}
}

// Tampilan asli input file sulit didandani, jadi yang terlihat adalah tombol
// biasa. Saat tombol ditekan, klik-nya diteruskan ke input file yang tersembunyi.
const openHeroPicker = () => heroFileInput.value?.click()

const handleHeroFileChange = async (e) => {
  const file = e.target.files?.[0]

  // Isi input dikosongkan supaya memilih file yang sama dua kali berturut-turut
  // tetap dianggap perubahan dan tetap memicu proses unggah.
  e.target.value = ''
  if (!file) return

  heroUploading.value = true
  heroError.value = ''
  try {
    // Dua langkah: unggah gambarnya dulu untuk mendapat alamat URL,
    // baru alamat itu disimpan sebagai pengaturan "hero-image".
    const { url } = await uploadImage(file)
    await updateSetting('hero-image', url)
    heroImageUrl.value = url
    toastMessage.value = t('admin.gallery.heroUpdateSuccess')
  } catch (err) {
    heroError.value = err.response?.data?.message || t('admin.gallery.heroUpdateFailed')
  } finally {
    heroUploading.value = false
  }
}

onMounted(async () => {
  // Tanpa await, jadi memuat foto hero dan daftar galeri berjalan bersamaan.
  loadHeroImage()
  try {
    await adminGalleryStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('admin.gallery.loadFailed')
  }
})

// Pencarian di sini dikerjakan server, bukan disaring di browser, karena
// gambarnya dimuat sedikit demi sedikit. Supaya server tidak dihubungi setiap
// ketikan, permintaan ditunda 0,4 detik dan timer sebelumnya dibatalkan tiap
// kali admin mengetik lagi — jadi yang terkirim hanya setelah berhenti mengetik.
const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(async () => {
    try {
      errorMessage.value = ''
      await adminGalleryStore.applySearch(searchQuery.value)
    } catch (err) {
      errorMessage.value = err.response?.data?.message || t('admin.gallery.loadFailed')
    }
  }, 400)
}

const loadMore = async () => {
  isLoadingMore.value = true
  try {
    await adminGalleryStore.loadMore()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('admin.gallery.loadFailed')
  } finally {
    isLoadingMore.value = false
  }
}

// Satu modal dipakai untuk dua keperluan. Kalau editingItem berisi data berarti
// mode ubah, kalau null berarti mode tambah baru.
const isModalOpen = ref(false)
const editingItem = ref(null)

const openAddModal = () => {
  editingItem.value = null
  isModalOpen.value = true
}

const openEditModal = (item) => {
  editingItem.value = item
  isModalOpen.value = true
}

const publicGalleryStore = useGalleryStore()

const handleSaved = () => {
  toastMessage.value = editingItem.value
    ? t('admin.gallery.editSuccess')
    : t('admin.gallery.addSuccess')

  // Galeri sisi pengunjung dan data statistik menyimpan salinan lama, jadi
  // keduanya ditandai kedaluwarsa supaya ikut diperbarui. Daftar di halaman ini
  // dimuat ulang tanpa await agar tampilan tidak ikut menunggu.
  publicGalleryStore.invalidate()
  analyticsStore.invalidate()
  adminGalleryStore.refresh().catch(() => {})
}

const deletingItem = ref(null)
const isDeleting = ref(false)
const deleteError = ref('')

const openDeleteConfirm = (item) => {
  deleteError.value = ''
  deletingItem.value = item
}

const handleDelete = async () => {
  if (!deletingItem.value) return

  isDeleting.value = true
  try {
    await deleteGallery(deletingItem.value.id)
    publicGalleryStore.invalidate()
    analyticsStore.invalidate()
    // Gambar dibuang dari daftar di layar lebih dulu supaya hilangnya terasa
    // langsung, baru data dari server disamakan lagi lewat refresh.
    adminGalleryStore.items = adminGalleryStore.items.filter((i) => i.id !== deletingItem.value.id)
    adminGalleryStore.refresh().catch(() => {})
  } catch (err) {
    deleteError.value = err.response?.data?.message || t('admin.gallery.deleteFailed')
  } finally {
    deletingItem.value = null
    isDeleting.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-4 mb-8">
      <h1 class="text-4xl">{{ t('admin.gallery.title') }}</h1>

      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 rounded-full bg-brand-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-600 transition-colors shrink-0"
      >
        <Plus class="w-4 h-4" stroke-width="2.4" />
        {{ t('admin.gallery.add') }}
      </button>
    </div>

    <!-- Kotak pengaturan foto hero beranda, terpisah dari daftar galeri. -->
    <div
      class="mb-8 bg-white rounded-2xl border border-cream-300 p-5 flex flex-col sm:flex-row sm:items-center gap-5"
    >
      <div
        class="w-28 h-28 rounded-xl bg-cream-100 overflow-hidden shrink-0 flex items-center justify-center"
      >
        <img
          v-if="heroImageUrl"
          :src="cloudinaryThumb(heroImageUrl, 300)"
          alt=""
          class="w-full h-full object-contain"
        />
        <span v-else class="text-xs text-cocoa-400 text-center px-2">
          {{ t('admin.gallery.heroNoImage') }}
        </span>
      </div>
      <div class="flex-1 min-w-0">
        <h2 class="font-bold text-lg mb-1">{{ t('admin.gallery.heroTitle') }}</h2>
        <p class="text-sm text-cocoa-400 mb-3">{{ t('admin.gallery.heroDesc') }}</p>
        <button
          type="button"
          :disabled="heroUploading"
          @click="openHeroPicker"
          class="inline-flex items-center gap-2 rounded-full bg-brand-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {{ heroUploading ? t('admin.gallery.heroUploading') : t('admin.gallery.heroChange') }}
        </button>
        <!-- Input file asli disembunyikan; yang ditekan admin adalah tombol
             di atas, lalu klik-nya diteruskan ke sini lewat ref. -->
        <input
          ref="heroFileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleHeroFileChange"
        />
        <p v-if="heroError" class="text-sm text-brand-600 mt-2">{{ heroError }}</p>
      </div>
    </div>

    <div class="flex items-center gap-4 mb-6">
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 text-cocoa-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          @input="handleSearchInput"
          type="text"
          :placeholder="t('admin.gallery.searchPlaceholder')"
          class="w-full rounded-full border border-cream-300 bg-white pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
        />
      </div>
      <p class="text-sm font-semibold text-cocoa-400 shrink-0">
        {{ t('admin.gallery.imageCount', { count: totalItems }) }}
      </p>
    </div>

    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">
      {{ t('admin.gallery.loading') }}
    </div>

    <div v-else-if="errorMessage" class="text-center text-brand-600 py-24">
      {{ errorMessage }}
    </div>

    <div
      v-else-if="galleryItems.length === 0"
      class="text-center text-cocoa-400 py-24 bg-white rounded-2xl border border-dashed border-cream-300"
    >
      {{ t('admin.gallery.empty') }}
    </div>

    <template v-else>
      <p v-if="deleteError" class="text-sm text-brand-600 mb-4">{{ deleteError }}</p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="item in galleryItems"
          :key="item.id"
          class="relative aspect-square rounded-xl bg-cream-100 shadow-[0_2px_10px_-4px_rgba(51,38,31,0.12)] overflow-hidden group"
        >
          <!-- cloudinaryThumb meminta versi kecil gambar (400px), bukan foto
               aslinya, supaya halaman tidak berat. loading="lazy" membuat
               gambar baru diunduh saat hampir terlihat di layar. -->
          <img
            v-if="item.imageUrl"
            :src="cloudinaryThumb(item.imageUrl, 400)"
            :alt="item.title"
            loading="lazy"
            class="w-full h-full object-cover"
          />

          <div class="absolute top-2 right-2 flex items-center gap-1.5">
            <button
              type="button"
              @click="openEditModal(item)"
              class="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-cocoa-500 hover:text-brand-600 hover:bg-white transition"
              :aria-label="t('admin.gallery.editAria', { name: item.title })"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              type="button"
              @click="openDeleteConfirm(item)"
              class="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-cocoa-500 hover:text-red-600 hover:bg-white transition"
              :aria-label="t('admin.gallery.deleteAria', { name: item.title })"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Gambar dimuat bertahap. Tombol ini hanya muncul selama masih ada
           sisa gambar yang belum ditampilkan. -->
      <div v-if="adminGalleryStore.hasMore" class="flex justify-center mt-8">
        <button
          type="button"
          :disabled="isLoadingMore"
          @click="loadMore"
          class="rounded-full border border-brand-500 text-brand-500 px-6 py-2.5 text-sm font-bold hover:bg-brand-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {{ isLoadingMore ? t('admin.gallery.loadingMore') : t('admin.gallery.loadMore') }}
        </button>
      </div>
    </template>

    <!-- Modal, dialog konfirmasi, dan notifikasi ditaruh di bagian bawah karena
         posisinya melayang di atas halaman, bukan mengikuti urutan isi. -->
    <GalleryFormModal
      :open="isModalOpen"
      :item="editingItem"
      @close="isModalOpen = false"
      @saved="handleSaved"
    />

    <ConfirmDialog
      :open="!!deletingItem"
      :title="t('admin.gallery.deleteTitle')"
      :message="t('admin.gallery.deleteMessage', { name: deletingItem?.title })"
      :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')"
      :is-loading="isDeleting"
      @confirm="handleDelete"
      @cancel="deletingItem = null"
    />

    <Toast v-model:message="toastMessage" />
  </div>
</template>
