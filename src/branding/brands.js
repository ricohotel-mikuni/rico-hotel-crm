// Every screen renders under one of these brands. `homePath` is the
// route each brand's "home"/breadcrumb actions resolve to — this is
// what lets the exact same shared components (Header, Breadcrumb,
// ComingSoon, PropertySidebar) work correctly whether they're
// rendered at the company level or nested inside a property, without
// hardcoding a path anywhere. Add a brand here when a new business
// line/property needs its own identity.
export const BRANDS = {
  daiei: {
    id: 'daiei',
    name: '大栄商事株式会社',
    nameLines: null,
    tagline: 'DAIEI SHOJI CO., LTD.',
    subtitle: '統合管理システム',
    logo: '/brand-daiei-icon.png',
    homePath: '/',
  },
  ricoHotel: {
    id: 'ricoHotel',
    name: 'RICO HOTEL MIKUNI',
    shortNameJa: 'リコホテル三国',
    nameLines: ['RICO HOTEL', 'MIKUNI'],
    tagline: 'HOTEL MANAGEMENT SYSTEM',
    subtitle: 'ホテル管理システム',
    logo: '/logo.png',
    homePath: '/hotels/rico-mikuni',
  },
}
