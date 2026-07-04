<script setup>
import { RouterLink } from 'vue-router'
import { Heart, Cake, Sparkles, Clock, MessageCircle, Instagram, MapPin } from 'lucide-vue-next'
import logo from '@/assets/images/logo.jpeg'
import { STORE_INFO } from '@/config/constants'

const yearsOfExperience = new Date().getFullYear() - STORE_INFO.since

const values = [
  {
    icon: Heart,
    title: 'Dibuat dengan Cinta',
    description:
      'Setiap kue dibuat satu per satu dengan penuh perhatian, seperti membuatkan kue untuk keluarga sendiri.',
  },
  {
    icon: Cake,
    title: 'Bahan Berkualitas',
    description:
      'Kami hanya memakai bahan pilihan — butter, cokelat, dan cream terbaik supaya rasanya selalu konsisten.',
  },
  {
    icon: Sparkles,
    title: 'Custom Sesuai Keinginanmu',
    description:
      'Punya ide desain sendiri? Ceritakan saja! Kami bantu wujudkan kue impianmu, dari yang simpel sampai yang unik.',
  },
  {
    icon: Clock,
    title: 'Selalu Fresh',
    description:
      'Kue dibuat mendekati jadwal pengambilan atau pengantaran, jadi selalu sampai di tanganmu dalam kondisi segar.',
  },
]
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="max-w-7xl mx-auto px-6 pt-16 pb-14 text-center">
      <img
        :src="logo"
        alt="Logo Talita's Cake & Cupcakes"
        class="h-28 w-28 rounded-full object-cover mx-auto mb-6"
      />
      <p class="text-sm font-semibold text-brand-600 mb-3">Sejak {{ STORE_INFO.since }} ❤</p>
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
        Tentang <span class="text-brand-600">Talita's Cake &amp; Cupcakes</span>
      </h1>
      <p class="text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Toko kue rumahan yang percaya bahwa setiap momen spesial layak dirayakan
        dengan kue yang lezat dan cantik.
      </p>
    </section>

    <hr class="border-gray-200" />

    <!-- CERITA KAMI -->
    <section class="max-w-3xl mx-auto px-6 py-16">
      <p class="text-sm font-semibold text-brand-600 mb-2">Cerita Kami</p>
      <h2 class="text-3xl font-extrabold mb-6">
        Berawal dari Dapur Rumah, {{ yearsOfExperience }} Tahun Menemani Momen Manismu
      </h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          Talita's Cake &amp; Cupcakes dimulai pada tahun {{ STORE_INFO.since }}
          dari dapur rumah sederhana dan kecintaan pada baking. Dari pesanan
          pertama untuk teman dan tetangga, satu per satu pelanggan datang
          kembali — bukan hanya karena rasanya, tapi juga karena setiap kue
          dibuat dengan sepenuh hati.
        </p>
        <p>
          Kini kami melayani berbagai pesanan: kue ulang tahun, cupcakes, sampai
          kue custom dengan desain sesuai keinginanmu. Meskipun pesanan terus
          bertambah, cara kami bekerja tidak berubah — bahan pilihan, dibuat
          fresh, dan diperlakukan seperti kue untuk keluarga sendiri.
        </p>
        <p>
          Terima kasih sudah mempercayakan momen spesialmu kepada kami. Kami
          tidak sabar membuatkan kue untuk perayaanmu berikutnya! 🎂
        </p>
      </div>
    </section>

    <hr class="border-gray-200" />

    <!-- KENAPA PILIH KAMI -->
    <section class="max-w-7xl mx-auto px-6 py-16">
      <p class="text-sm font-semibold text-brand-600 mb-2 text-center">Kenapa Pilih Kami</p>
      <h2 class="text-3xl font-extrabold mb-10 text-center">
        Yang Membuat Kue Kami Berbeda
      </h2>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="value in values"
          :key="value.title"
          class="rounded-2xl border border-gray-200 p-6"
        >
          <div class="w-11 h-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
            <component :is="value.icon" class="w-5 h-5" />
          </div>
          <h3 class="font-bold mb-1.5">{{ value.title }}</h3>
          <p class="text-sm text-gray-600 leading-relaxed">{{ value.description }}</p>
        </div>
      </div>
    </section>

    <hr class="border-gray-200" />

    <!-- KONTAK & CTA -->
    <section class="max-w-3xl mx-auto px-6 py-16 text-center">
      <h2 class="text-3xl font-extrabold mb-3">Siap Pesan Kue Impianmu?</h2>
      <p class="text-gray-600 mb-8">
        Lihat menu kami, atau hubungi kami kalau ada pertanyaan —
        kami dengan senang hati membantu.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <RouterLink
          to="/menu"
          class="rounded-full bg-brand-600 text-white px-6 py-3 text-sm font-semibold hover:bg-brand-700 transition"
        >
          Lihat Menu
        </RouterLink>

        <a
          v-if="STORE_INFO.whatsappNumber"
          :href="`https://wa.me/${STORE_INFO.whatsappNumber}`"
          target="_blank"
          rel="noopener"
          class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand-600 hover:text-white transition"
        >
          <MessageCircle class="w-4 h-4" />
          Chat WhatsApp
        </a>

        <a
          v-if="STORE_INFO.instagram"
          :href="`https://instagram.com/${STORE_INFO.instagram}`"
          target="_blank"
          rel="noopener"
          class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand-600 hover:text-white transition"
        >
          <Instagram class="w-4 h-4" />
          @{{ STORE_INFO.instagram }}
        </a>
      </div>

      <p
        v-if="STORE_INFO.address"
        class="mt-8 text-sm text-gray-600 inline-flex items-center gap-1.5"
      >
        <MapPin class="w-4 h-4 text-brand-600" />
        {{ STORE_INFO.address }}
      </p>
    </section>
  </div>
</template>
