// Pengaturan toko — ubah nilai di sini untuk menyesuaikan.
export const STORE_CONFIG = {
  name: "Toko Serba Ada",
  // Nomor WhatsApp tujuan bukti pembayaran (format internasional tanpa tanda +)
  whatsappNumber: "6282227273865",
  whatsappDisplay: "0822-2727-3865",
  ownerEmail: "xivion27@gmail.com",
  // Info rekening untuk transfer manual — sesuaikan dengan rekening Anda.
  bank: {
    name: "BCA",
    accountNumber: "1234567890",
    accountHolder: "Toko Serba Ada",
  },
}

export const ORDER_STATUS = {
  menunggu_pembayaran: { label: "Menunggu Pembayaran", color: "amber" },
  menunggu_konfirmasi: { label: "Menunggu Konfirmasi", color: "blue" },
  diproses: { label: "Diproses", color: "violet" },
  selesai: { label: "Selesai", color: "green" },
  dibatalkan: { label: "Dibatalkan", color: "red" },
} as const

export type OrderStatus = keyof typeof ORDER_STATUS
