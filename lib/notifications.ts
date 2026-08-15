import { STORE_CONFIG } from "@/lib/config"
import { formatRupiah } from "@/lib/utils"
import type { Order } from "@/lib/db/schema"

// Modul notifikasi email.
//
// Email otomatis (ucapan terima kasih ke pembeli & notifikasi ke owner)
// akan aktif setelah RESEND_API_KEY ditambahkan ke environment variables.
// Tanpa key, notifikasi hanya dicatat di log server agar pesanan tetap berjalan.

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[v0] Email dilewati (RESEND_API_KEY belum diset). Tujuan: ${to} | Subjek: ${subject}`)
    return { skipped: true }
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.log(`[v0] Gagal mengirim email ke ${to}: ${text}`)
    return { error: text }
  }
  return { ok: true }
}

function itemsTable(order: Order) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatRupiah(i.price * i.quantity)}</td></tr>`,
    )
    .join("")
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead><tr><th style="padding:8px;text-align:left;border-bottom:2px solid #333">Produk</th><th style="padding:8px;text-align:center;border-bottom:2px solid #333">Qty</th><th style="padding:8px;text-align:right;border-bottom:2px solid #333">Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="2" style="padding:8px;text-align:right;font-weight:bold">Total</td><td style="padding:8px;text-align:right;font-weight:bold">${formatRupiah(order.total)}</td></tr></tfoot>
  </table>`
}

export async function sendCustomerThankYou(order: Order) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <h2 style="color:#2e7d4f">Terima kasih atas pesanan Anda, ${order.customerName}!</h2>
    <p>Pesanan Anda dengan kode <strong>${order.orderCode}</strong> telah kami terima.</p>
    ${itemsTable(order)}
    <p style="margin-top:16px">Silakan selesaikan pembayaran dan kirim bukti transfer ke WhatsApp kami di <strong>${STORE_CONFIG.whatsappDisplay}</strong> agar pesanan segera kami proses.</p>
    <p style="color:#666;font-size:13px">Salam hangat,<br/>${STORE_CONFIG.name}</p>
  </div>`
  return sendEmail(order.customerEmail, `Terima kasih! Pesanan ${order.orderCode} diterima`, html)
}

export async function notifyOwnerNewOrder(order: Order) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <h2 style="color:#2e7d4f">Pesanan Baru Masuk! ${order.orderCode}</h2>
    <p><strong>Nama:</strong> ${order.customerName}<br/>
    <strong>Email:</strong> ${order.customerEmail}<br/>
    <strong>WhatsApp:</strong> ${order.customerPhone}<br/>
    <strong>Alamat:</strong> ${order.customerAddress || "-"}<br/>
    <strong>Catatan:</strong> ${order.note || "-"}</p>
    ${itemsTable(order)}
    <p style="margin-top:16px">Buka admin panel untuk mengelola pesanan ini.</p>
  </div>`
  return sendEmail(STORE_CONFIG.ownerEmail, `[Pesanan Baru] ${order.orderCode} - ${formatRupiah(order.total)}`, html)
}
