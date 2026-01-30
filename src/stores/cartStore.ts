import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  image?: string;
  stepQty: number;
  minOrderQty: number;
  stockQty: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  incrementQuantity: (productId: string, variantId?: string) => void;
  decrementQuantity: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (productId: string, variantId?: string) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.productId === newItem.productId && item.variantId === newItem.variantId
          );

          if (existingIndex > -1) {
            const updated = [...state.items];
            const item = updated[existingIndex];
            const newQty = Math.min(
              item.quantity + (newItem.quantity || item.stepQty),
              item.stockQty
            );
            updated[existingIndex] = { ...item, quantity: newQty };
            return { items: updated };
          }

          return {
            items: [
              ...state.items,
              { ...newItem, quantity: newItem.quantity || newItem.minOrderQty },
            ],
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
          ),
        }));
      },

      updateQuantity: (productId, quantity, variantId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.max(item.minOrderQty, Math.min(quantity, item.stockQty)) }
              : item
          ),
        }));
      },

      incrementQuantity: (productId, variantId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.min(item.quantity + item.stepQty, item.stockQty) }
              : item
          ),
        }));
      },

      decrementQuantity: (productId, variantId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.max(item.quantity - item.stepQty, item.minOrderQty) }
              : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getItemQuantity: (productId, variantId) => {
        const item = get().items.find(
          (i) => i.productId === productId && i.variantId === variantId
        );
        return item?.quantity || 0;
      },
    }),
    {
      name: 'xoztovars-cart',
    }
  )
);
