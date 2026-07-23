// src/utils/whatsapp.js

const DIVIDER = '━━━━━━━━━━━━━━';

const formatRupiah = (amount) =>
  `Rp${Number(amount).toLocaleString('id-ID')}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Susun teks pesan WhatsApp dari data order yang sudah tersimpan di DB
 * (order.items sudah include product & variant).
 */
export const buildWhatsappMessage = (order, { includeEmail = false } = {}) => {
  const lines = [];

  // Email pemesan hanya ditampilkan kalau user memilih menyertakannya.
  // Dengan menyertakan email, user setuju menerima promo/info menu.
  const emailLine =
    includeEmail && order.user?.email
      ? `Email pemesan: ${order.user.email}`
      : null;

  // ===== Header =====
  lines.push('*PESANAN BARU*');
  lines.push(`Order #${order.id.slice(0, 8).toUpperCase()}`);
  lines.push(DIVIDER);
  lines.push('');

  // ===== Detail item =====
  lines.push('*Detail Pesanan*');
  order.items.forEach((item, idx) => {
    const variantInfo = item.variant
      ? ` (${item.variant.shape} ${item.variant.size}cm)`
      : '';
    const itemSubtotal = Number(item.price) * Number(item.quantity);

    lines.push('');
    lines.push(`${idx + 1}. *${item.productName}*${variantInfo}`);
    if (item.flavor) lines.push(`   - Rasa: ${item.flavor}`);
    if (item.filling) lines.push(`   - Filling: ${item.filling}`);
    if (item.topping) lines.push(`   - Topping: ${item.topping}`);
    lines.push(
      `   - ${item.quantity} x ${formatRupiah(item.price)} = *${formatRupiah(itemSubtotal)}*`
    );
    if (item.textOnCake) lines.push(`   - Tulisan: ${item.textOnCake}`);
    if (item.notes) lines.push(`   - Catatan: ${item.notes}`);
    if (item.customImage) lines.push(`   - Gambar: ${item.customImage}`);
  });

  lines.push('');
  lines.push(DIVIDER);
  lines.push('');

  // ===== Tanggal =====
  lines.push(
    order.fulfillmentType === 'PICKUP' ? '*Tanggal Pickup*' : '*Tanggal Kirim*'
  );
  lines.push(formatDate(order.requestCakeDate));
  lines.push('');

  // ===== Metode pengiriman =====
  if (order.fulfillmentType === 'PICKUP') {
    lines.push('*Metode: Pickup*');
    lines.push('Ambil langsung di toko');
    // Pemesan mengambil sendiri -> tampilkan nama & no. HP pemesan
    if (order.user) {
      if (order.user.name) lines.push(`Nama pemesan: ${order.user.name}`);
      if (order.user.phone) lines.push(`No. HP pemesan: ${order.user.phone}`);
    }
    if (emailLine) lines.push(emailLine);
  } else {
    lines.push('*Metode: Delivery*');
    lines.push(
      `Untuk: ${order.recipientType === 'FOR_MYSELF' ? 'Saya sendiri' : 'Orang lain'}`
    );

    // Nama & no. HP pemesan selalu ditampilkan (baik untuk diri sendiri
    // maupun untuk orang lain) supaya owner punya kontak pemesannya.
    if (order.user) {
      if (order.user.name) lines.push(`Nama pemesan: ${order.user.name}`);
      if (order.user.phone) lines.push(`No. HP pemesan: ${order.user.phone}`);
    }
    if (emailLine) lines.push(emailLine);

    if (order.recipientType === 'FOR_SOMEONE_ELSE') {
      lines.push('');
      lines.push(`Nama penerima: ${order.recipientName}`);
      lines.push(`No. HP penerima: ${order.recipientPhone}`);
    }

    lines.push(`Alamat: ${order.address}`);
    lines.push(
      `Lokasi: https://www.google.com/maps?q=${order.addressLat},${order.addressLng}`
    );
    // Jarak dari toko (dipakai untuk menentukan ongkir) — tampilkan kalau ada.
    if (order.distanceKm != null) {
      lines.push(`Jarak: ± ${Number(order.distanceKm).toFixed(1)} km`);
    }
  }

  lines.push('');
  lines.push(DIVIDER);
  lines.push('');

  // ===== Rincian biaya =====
  lines.push('*Rincian Biaya*');
  lines.push(`Subtotal: ${formatRupiah(order.subtotal)}`);
  lines.push(`Ongkir: ${formatRupiah(order.deliveryFee)}`);
  lines.push(`*Total: ${formatRupiah(order.total)}*`);

  return lines.join('\n');
};

export const buildWhatsappLink = (phoneNumber, message) => {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
};