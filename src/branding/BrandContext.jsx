import { createContext, useContext, useEffect } from 'react'
import { BRANDS } from './brands'

const BrandContext = createContext(BRANDS.daiei)

// Remembers the last non-daiei (i.e. property-scoped) brand the user was
// under, so company-wide screens reached from a property (社員管理・
// 電子承認 etc., which render under the daiei brand since they aren't
// nested in that property's own route subtree) can insert it into the
// header breadcrumb — see layout/breadcrumbTrail.js's lastPropertyCrumb().
// Written here, once, so any current or future property brand gets this
// for free just by being wrapped in <BrandProvider>; no per-screen wiring
// needed.
export const LAST_PROPERTY_STORAGE_KEY = 'lastPropertyBrandId'

export function BrandProvider({ brand, children }) {
  useEffect(() => {
    if (brand.id !== BRANDS.daiei.id) {
      localStorage.setItem(LAST_PROPERTY_STORAGE_KEY, brand.id)
    }
  }, [brand.id])

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export const useBrand = () => useContext(BrandContext)
