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
export const buildWhatsappMessage = (order) => {
  const lines = [];

  // ===== Header =====
  lines.push('🎂 *PESANAN BARU*');
  lines.push(`Order #${order.id.slice(0, 8).toUpperCase()}`);
  lines.push(DIVIDER);
  lines.push('');

  // ===== Detail item =====
  lines.push('🛒 *Detail Pesanan*');
  order.items.forEach((item, idx) => {
    const variantInfo = item.variant
      ? ` (${item.variant.shape} ${item.variant.size}cm)`
      : '';
    const itemSubtotal = Number(item.price) * Number(item.quantity);

    lines.push('');
    lines.push(`${idx + 1}. *${item.productName}*${variantInfo}`);
    if (item.flavor) lines.push(`   • Rasa: ${item.flavor}`);
    lines.push(
      `   • ${item.quantity} × ${formatRupiah(item.price)} = *${formatRupiah(itemSubtotal)}*`
    );
    if (item.textOnCake) lines.push(`   • ✍️ Tulisan: ${item.textOnCake}`);
    if (item.notes) lines.push(`   • 📝 Catatan: ${item.notes}`);
    if (item.customImage) lines.push(`   • 🖼️ Gambar: ${item.customImage}`);
  });

  lines.push('');
  lines.push(DIVIDER);
  lines.push('');

  // ===== Tanggal request =====
  lines.push('📅 *Tanggal Request*');
  lines.push(formatDate(order.requestCakeDate));
  lines.push('');

  // ===== Metode pengiriman =====
  if (order.fulfillmentType === 'PICKUP') {
    lines.push('🏪 *Metode: Pickup*');
    lines.push('Ambil langsung di toko');
  } else {
    lines.push('🚚 *Metode: Delivery*');
    lines.push(
      `Untuk: ${order.recipientType === 'FOR_MYSELF' ? 'Saya sendiri' : 'Orang lain'}`
    );

    if (order.recipientType === 'FOR_SOMEONE_ELSE') {
      lines.push(`Nama penerima: ${order.recipientName}`);
      lines.push(`No. HP penerima: ${order.recipientPhone}`);
    }

    lines.push(`Alamat: ${order.address}`);
    lines.push(
      `📍 Lokasi: https://www.google.com/maps?q=${order.addressLat},${order.addressLng}`
    );
  }

  lines.push('');
  lines.push(DIVIDER);
  lines.push('');

  // ===== Rincian biaya =====
  lines.push('💰 *Rincian Biaya*');
  lines.push(`Subtotal: ${formatRupiah(order.subtotal)}`);
  lines.push(`Ongkir: ${formatRupiah(order.deliveryFee)}`);
  lines.push(`*Total: ${formatRupiah(order.total)}*`);

  return lines.join('\n');
};

export const buildWhatsappLink = (phoneNumber, message) => {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
};