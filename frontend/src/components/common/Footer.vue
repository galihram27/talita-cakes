<script setup>
import { useI18n } from "vue-i18n";
import { STORE_INFO } from "@/config/constants";
import logo from "@/assets/images/logo.png";
import halalLogo from "@/assets/images/halal-indonesia-logo.png";

const { t } = useI18n();
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
          {{ t("footer.tagline", { since: STORE_INFO.since }) }}
        </p>
      </div>

      <div class="flex flex-wrap gap-14">
        <div>
          <div
            class="text-xs font-extrabold tracking-[0.12em] uppercase text-[#8A7160] mb-3"
          >
            {{ t("footer.contact") }}
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
            <span v-if="STORE_INFO.address" class="max-w-[320px]">
              {{ STORE_INFO.address }}
            </span>
          </div>
        </div>

        <div>
          <div
            class="text-xs font-extrabold tracking-[0.12em] uppercase text-[#8A7160] mb-3"
          >
            {{ t("footer.followUs") }}
          </div>
          <div class="flex items-center gap-3">
            <a
              v-if="STORE_INFO.instagram"
              :href="`https://instagram.com/${STORE_INFO.instagram}`"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-[#E6D3C2] hover:bg-white hover:text-cocoa-900 transition-colors"
            >
              <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.98c-3.15 0-3.5.01-4.74.07-.9.04-1.38.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.33-.28.81-.32 1.71-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.04.9.19 1.38.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.33.13.81.28 1.71.32 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.38-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.33.28-.81.32-1.71.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.04-.9-.19-1.38-.32-1.71a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.33-.13-.81-.28-1.71-.32-1.24-.06-1.59-.07-4.74-.07Zm0 3.37a4.49 4.49 0 1 1 0 8.98 4.49 4.49 0 0 1 0-8.98Zm0 7.4a2.91 2.91 0 1 0 0-5.82 2.91 2.91 0 0 0 0 5.82Zm5.72-7.6a1.05 1.05 0 1 1-2.1 0 1.05 1.05 0 0 1 2.1 0Z"/>
              </svg>
            </a>
            <a
              v-if="STORE_INFO.threads"
              :href="`https://threads.net/@${STORE_INFO.threads}`"
              target="_blank"
              rel="noopener"
              aria-label="Threads"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-[#E6D3C2] hover:bg-white hover:text-cocoa-900 transition-colors"
            >
              <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M12.19 22h-.04c-2.71-.02-4.8-.92-6.2-2.68C4.7 17.75 4.05 15.46 4.02 12.6v-.02-.02c.03-2.86.68-5.15 1.93-6.72C7.35 4.08 9.44 3.18 12.15 3.16h.04c2.08.01 3.82.55 5.17 1.6 1.27.98 2.16 2.38 2.66 4.16l-1.85.5c-.83-2.95-2.72-4.28-5.99-4.3-2.15.02-3.78.7-4.83 2.02-.98 1.24-1.5 3.02-1.53 5.29.03 2.27.55 4.05 1.53 5.29 1.05 1.32 2.68 2 4.83 2.02 1.95-.01 3.24-.47 4.32-1.53.68-.67 1.13-1.53 1.35-2.5-.62-.36-1.36-.61-2.2-.75-.13 1.4-.62 2.42-1.9 2.43-1.28.01-2.28-.86-2.4-2.05-.13-1.28.85-2.31 2.5-2.42.44-.03.86-.02 1.24.02-.05-.44-.16-.82-.34-1.13-.27-.47-.72-.71-1.35-.72-.66 0-1.11.28-1.39.83l-1.66-.72c.6-1.17 1.68-1.77 3.06-1.76 2.02.02 3.24 1.28 3.42 3.53l-.01.01c.7.29 1.32.68 1.83 1.17.99.94 1.5 2.28 1.5 3.98 0 .02 0 .03-.01.05-.04 1.53-.7 2.83-1.96 3.87-1.24 1.03-2.94 1.55-5.06 1.56Zm.75-8.32c-.19 0-.38 0-.58.02-.98.06-1.32.51-1.28.95.04.42.5.72 1.04.72h.03c.6-.01.91-.42.98-1.42.01-.09.01-.18.01-.27a4.6 4.6 0 0 0-.23 0Z"/>
              </svg>
            </a>
            <a
              v-if="STORE_INFO.tiktok"
              :href="`https://tiktok.com/@${STORE_INFO.tiktok}`"
              target="_blank"
              rel="noopener"
              aria-label="TikTok"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-[#E6D3C2] hover:bg-white hover:text-cocoa-900 transition-colors"
            >
              <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.1v12.4a2.6 2.6 0 0 1-2.6 2.52 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.4-2.47V9.66a5.7 5.7 0 0 0-.8-.06A5.72 5.72 0 0 0 4.1 15.3a5.72 5.72 0 0 0 5.72 5.72 5.72 5.72 0 0 0 5.72-5.72V9.01a7.3 7.3 0 0 0 4.36 1.43V7.34a4.29 4.29 0 0 1-3.3-1.52Z"/>
              </svg>
            </a>
          </div>

          <!-- Sertifikasi Halal Indonesia (BPJPH) -->
          <div
            v-if="STORE_INFO.halalCertNumber"
            class="mt-6 w-[76px]"
          >
            <img
              :src="halalLogo"
              alt="Halal Indonesia (BPJPH)"
              class="w-full h-auto object-contain"
            />
            <div
              class="mt-2 w-full text-center text-[8px] leading-none tabular-nums text-white whitespace-nowrap"
            >
              {{ STORE_INFO.halalCertNumber }}
            </div>
          </div>
        </div>

        <div>
          <div
            class="text-xs font-extrabold tracking-[0.12em] uppercase text-[#8A7160] mb-3"
          >
            {{ t("footer.legal") }}
          </div>
          <div class="flex flex-col gap-2 text-sm">
            <RouterLink
              :to="{ name: 'faq' }"
              class="text-[#E6D3C2] hover:text-white transition-colors"
            >
              {{ t("footer.faq") }}
            </RouterLink>
            <RouterLink
              :to="{ name: 'terms' }"
              class="text-[#E6D3C2] hover:text-white transition-colors"
            >
              {{ t("footer.terms") }}
            </RouterLink>
            <RouterLink
              :to="{ name: 'privacy' }"
              class="text-[#E6D3C2] hover:text-white transition-colors"
            >
              {{ t("footer.privacy") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
    <div
      class="border-t border-[#4A3A30] text-center text-[12.5px] py-4 px-4 text-[#8A7160]"
    >
      {{ t("footer.bottom", { year }) }}
    </div>
  </footer>
</template>
