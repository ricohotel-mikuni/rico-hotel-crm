import { createContext, useContext } from 'react'
import { BRANDS } from './brands'

const BrandContext = createContext(BRANDS.daiei)

export function BrandProvider({ brand, children }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export const useBrand = () => useContext(BrandContext)
