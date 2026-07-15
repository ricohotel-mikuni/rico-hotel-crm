import { createContext, useContext } from 'react'

// 現在表示中のホテル(拠点)を配下のモジュールへ供給する。統合ホテル
// 管理モジュール(承認済み提案書)でHotelsApp.jsxのルーティングを
// 動的化した際に新設 — 今回時点ではPropertyHub/SalesApp等はまだ
// これを消費しない(単一ホテル前提のまま)。将来、複数ホテルを本当に
// 横断するモジュール(AI総支配人等)が増えた際、ここから
// hotelId/companyIdを取得できるようにするための土台。
const HotelContext = createContext(null)

export function HotelProvider({ value, children }) {
  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>
}

export const useCurrentHotel = () => useContext(HotelContext)
