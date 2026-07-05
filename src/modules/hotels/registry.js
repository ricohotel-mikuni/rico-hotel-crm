// Static list of hotel properties under 大栄商事's ホテル事業. Mirrors
// the `locations`/`hotels` rows seeded by
// supabase/migrations/005_company_foundation.sql (`slug` matches).
// This stays a plain static registry for now, same pattern as
// src/modules/registry.js — a future "add a hotel" admin flow would
// read this list from Supabase instead.
export const HOTELS = [
  {
    slug: 'rico-mikuni',
    name: 'リコホテル三国',
    address: '大阪市淀川区三国',
    status: 'active',
    desc: '営業管理システム稼働中',
  },
]
