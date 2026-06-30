// src/utils/whatsapp.js

const formatRupiah = (amount) =>
  `Rp${Number(amount).toLocaleString('id-ID')}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('id-ID', {
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

  lines.push(`*PESANAN BARU* (Order #${order.id.slice(0, 8)})`);
  lines.push('');

  lines.push('*Detail Item:*');
  order.items.forEach((item, idx) => {
    const variantInfo = item.variant
      ? ` (${item.variant.shape} ${item.variant.size}cm)`
      : '';
    const flavorInfo = item.flavor ? ` - ${item.flavor}` : '';

    lines.push(`${idx + 1}. ${item.productName}${variantInfo}${flavorInfo}`);
    lines.push(`   Qty: ${item.quantity} x ${formatRupiah(item.price)}`);
    if (item.textOnCake) lines.push(`   Text on cake: ${item.textOnCake}`);
    if (item.notes) lines.push(`   Notes: ${item.notes}`);
    if (item.customImage) lines.push(`   Custom image: ${item.customImage}`);
  });

  lines.push('');
  lines.push(`*Tanggal request:* ${formatDate(order.requestCakeDate)}`);
  lines.push('');

  if (order.fulfillmentType === 'PICKUP') {
    lines.push('*Metode:* Pickup (ambil di toko)');
  } else {
    lines.push('*Metode:* Delivery');
    lines.push(
      `*Untuk:* ${order.recipientType === 'FOR_MYSELF' ? 'Saya sendiri' : 'Orang lain'}`
    );

    if (order.recipientType === 'FOR_SOMEONE_ELSE') {
      lines.push(`*Nama penerima:* ${order.recipientName}`);
      lines.push(`*No. HP penerima:* ${order.recipientPhone}`);
    }

    lines.push(`*Alamat:* ${order.address}`);
    lines.push(
      `*Lokasi map:* https://www.google.com/maps?q=${order.addressLat},${order.addressLng}`
    );
  }

  lines.push('');
  lines.push(`Subtotal: ${formatRupiah(order.subtotal)}`);
  lines.push(`Ongkir: ${formatRupiah(order.deliveryFee)}`);
  lines.push(`*Total: ${formatRupiah(order.total)}*`);

  return lines.join('\n');
};

export const buildWhatsappLink = (phoneNumber, message) => {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
};