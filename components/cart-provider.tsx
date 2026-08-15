"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Product } from "@/lib/db/schema"

export type CartLine = {
  productId: number
  name: string
  price: number
  imageUrl: string
  stock: number
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  totalItems: number
  totalPrice: number
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: number) => void
  setQuantity: (productId: number, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = "toko-cart-v1"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setLines(JSON.parse(raw))
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // ignore
    }
  }, [lines, hydrated])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, product.stock)
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: nextQty } : l))
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          stock: product.stock,
          quantity: Math.min(quantity, product.stock),
        },
      ]
    })
  }, [])

  const removeItem = useCallback((productId: number) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }, [])

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity: Math.min(Math.max(1, quantity), l.stock) } : l))
        .filter((l) => l.quantity > 0),
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0)
  const totalPrice = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

  return (
    <CartContext.Provider value={{ lines, totalItems, totalPrice, addItem, removeItem, setQuantity, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart harus dipakai di dalam CartProvider")
  return ctx
}
