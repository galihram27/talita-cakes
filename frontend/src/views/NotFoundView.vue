<template>
  <div class="tc-page max-w-[560px] mx-auto px-8 py-24 text-center">
    <div class="font-display text-[90px] text-[#E9D5C3] leading-none">404</div>
    <h1 class="font-display text-[30px] mt-2.5 mb-3">{{ $t('notFound.title') }}</h1>
    <p class="text-[#6E5A4D] mb-6">
      {{ $t('notFound.desc') }}
    </p>
    <RouterLink
      to="/"
      class="inline-flex bg-brand-500 text-white font-bold text-[15px] px-7 py-3 rounded-full hover:bg-brand-600 transition-colors"
    >
      {{ $t('notFound.backHome') }}
    </RouterLink>
  </div>
</template>
