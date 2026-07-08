<script setup>
import { STORE_INFO } from "@/config/constants";
import logo from "@/assets/images/logo.png";

const year = new Date().getFullYear();
</script>

<template>
  <footer class="bg-cocoa-900 text-[#C9B4A3] mt-auto">
    <div
      class="max-w-[1160px] mx-auto px-5 md:px-8 pt-12 pb-10 flex flex-wrap gap-12 justify-between"
    >
      <div class="max-w-[300px]">
        <div class="flex items-center gap-3 mb-3">
          <img
            :src="logo"
            alt=""
            class="w-[42px] h-[42px] object-contain bg-cream-50 rounded-full p-[3px]"
          />
          <span class="font-display text-lg text-cream-50">
            Talita's Cake &amp; Cupcakes
          </span>
        </div>
        <p class="text-[13.5px] leading-relaxed">
          Homemade cakes full of love since {{ STORE_INFO.since }}. Every cake
          is made to order.
        </p>
      </div>

      <div class="flex flex-wrap gap-14">
        <div>
          <div
            class="text-xs font-extrabold tracking-[0.12em] uppercase text-[#8A7160] mb-3"
          >
            Contact
          </div>
          <div class="flex flex-col gap-2 text-sm">
            <a
              v-if="STORE_INFO.whatsappNumber"
              :href="`https://wa.me/${STORE_INFO.whatsappNumber}`"
              target="_blank"
              rel="noopener"
              class="text-[#E6D3C2] hover:text-white transition-colors"
            >
              WhatsApp +{{ STORE_INFO.whatsappNumber }}
            </a>
            <a
              v-if="STORE_INFO.instagram"
              :href="`https://instagram.com/${STORE_INFO.instagram}`"
              target="_blank"
              rel="noopener"
              class="text-[#E6D3C2] hover:text-white transition-colors"
            >
              Instagram @{{ STORE_INFO.instagram }}
            </a>
            <a
              v-if="STORE_INFO.threads"
              :href="`https://threads.net/@${STORE_INFO.threads}`"
              target="_blank"
              rel="noopener"
              class="text-[#E6D3C2] hover:text-white transition-colors"
            >
              Threads @{{ STORE_INFO.threads }}
            </a>
            <a
              v-if="STORE_INFO.tiktok"
              :href="`https://tiktok.com/@${STORE_INFO.tiktok}`"
              target="_blank"
              rel="noopener"
              class="text-[#E6D3C2] hover:text-white transition-colors"
            >
              TikTok @{{ STORE_INFO.tiktok }}
            </a>
            <span v-if="STORE_INFO.address" class="max-w-[320px]">
              {{ STORE_INFO.address }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div
      class="border-t border-[#4A3A30] text-center text-[12.5px] py-4 px-4 text-[#8A7160]"
    >
      © {{ year }} Talita's Cake &amp; Cupcakes · Pre-order 7 days ahead ·
      Confirmed via WhatsApp
    </div>
  </footer>
</template>
