"use server"

import { db } from "@/lib/db"
import { products, orders, type OrderItem } from "@/lib/db/schema"
import { and, desc, eq, inArray } from "drizzle-orm"
import { notifyOwnerNewOrder, sendCustomerThankYou } from "@/lib/notifications"

export async function getActiveProducts() {
  return db.select().from(products).where(eq(products.active, true)).orderBy(desc(products.createdAt))
}

export async function getProductById(id: number) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1)
  return rows[0] ?? null
}

type CartInput = { productId: number; quantity: number }

type CustomerInput = {
  name: string
  email: string
  phone: string
  address: string
  note: string
}

function generateOrderCode() {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `INV-${y}${m}${d}-${rand}`
}

export async function createOrder(cart: CartInput[], customer: CustomerInput) {
  // Validasi dasar
  if (!Array.isArray(cart) || cart.length === 0) {
    return { ok: false as const, error: "Keranjang kosong." }
  }
  if (!customer.name?.trim() || !customer.email?.trim() || !customer.phone?.trim()) {
    return { ok: false as const, error: "Nama, email, dan nomor WhatsApp wajib diisi." }
  }

  // Normalisasi & validasi quantity
  const cleaned: CartInput[] = []
  for (const item of cart) {
    const qty = Math.floor(Number(item.quantity))
    const pid = Math.floor(Number(item.productId))
    if (!Number.isFinite(qty) || qty <= 0 || qty > 999) {
      return { ok: false as const, error: "Jumlah produk tidak valid." }
    }
    if (!Number.isFinite(pid) || pid <= 0) {
      return { ok: false as const, error: "Produk tidak valid." }
    }
    cleaned.push({ productId: pid, quantity: qty })
  }

  // Ambil harga dari server (jangan percaya harga dari client)
  const ids = cleaned.map((c) => c.productId)
  const dbProducts = await db.select().from(products).where(inArray(products.id, ids))
  const productMap = new Map(dbProducts.map((p) => [p.id, p]))

  const orderItems: OrderItem[] = []
  let total = 0
  for (const item of cleaned) {
    const product = productMap.get(item.productId)
    if (!product || !product.active) {
      return { ok: false as const, error: `Produk tidak tersedia lagi.` }
    }
    if (product.stock < item.quantity) {
      return {
        ok: false as const,
        error: `Stok "${product.name}" tidak cukup (tersisa ${product.stock}).`,
      }
    }
    total += product.price * item.quantity
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    })
  }

  const orderCode = generateOrderCode()

  const [created] = await db
    .insert(orders)
    .values({
      orderCode,
      customerName: customer.name.trim(),
      customerEmail: customer.email.trim(),
      customerPhone: customer.phone.trim(),
      customerAddress: customer.address?.trim() ?? "",
      items: orderItems,
      total,
      status: "menunggu_pembayaran",
      note: customer.note?.trim() ?? "",
    })
    .returning()

  // Kurangi stok
  for (const item of cleaned) {
    const product = productMap.get(item.productId)!
    await db
      .update(products)
      .set({ stock: product.stock - item.quantity })
      .where(eq(products.id, item.productId))
  }

  // Kirim notifikasi (email owner + ucapan terima kasih ke pembeli).
  // Tidak memblokir pembuatan pesanan jika email gagal.
  try {
    await Promise.allSettled([notifyOwnerNewOrder(created), sendCustomerThankYou(created)])
  } catch {
    // abaikan error notifikasi
  }

  return { ok: true as const, orderCode, orderId: created.id, total }
}

export async function getOrderByCode(orderCode: string) {
  const rows = await db.select().from(orders).where(eq(orders.orderCode, orderCode)).limit(1)
  return rows[0] ?? null
}
