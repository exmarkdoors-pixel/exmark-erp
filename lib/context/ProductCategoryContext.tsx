'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProductCategoryConfig } from '@/types/categories';

interface ProductCategoryContextType {
  categories: ProductCategoryConfig[];
  isWpcEnabled: boolean;
  isLoading: boolean;
  toggleCategory: (code: string, enabled: boolean) => Promise<boolean>;
  refreshCategories: () => Promise<void>;
}

const ProductCategoryContext = createContext<ProductCategoryContextType>({
  categories: [],
  isWpcEnabled: false,
  isLoading: true,
  toggleCategory: async () => false,
  refreshCategories: async () => {},
});

export function ProductCategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<ProductCategoryConfig[]>([]);
  const [isWpcEnabled, setIsWpcEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    fetch('/api/settings/product-categories')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (active && json?.data) {
          setCategories(json.data);
          setIsWpcEnabled(Boolean(json.isWpcEnabled));
        }
      })
      .catch((err) => {
        console.warn('Failed to load product categories:', err);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings/product-categories');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setCategories(json.data);
          setIsWpcEnabled(Boolean(json.isWpcEnabled));
        }
      }
    } catch (err) {
      console.warn('Failed to refresh product categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = async (code: string, enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/product-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, enabled }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCategories((prev) =>
            prev.map((c) => (c.code === code ? { ...c, enabled, reportingVisibility: enabled } : c))
          );
          if (code === 'WPC') {
            setIsWpcEnabled(enabled);
          }
          return true;
        }
      }
    } catch (err) {
      console.error('Error toggling category:', err);
    }
    return false;
  };

  return (
    <ProductCategoryContext.Provider
      value={{
        categories,
        isWpcEnabled,
        isLoading,
        toggleCategory,
        refreshCategories,
      }}
    >
      {children}
    </ProductCategoryContext.Provider>
  );
}

export function useProductCategories() {
  return useContext(ProductCategoryContext);
}
