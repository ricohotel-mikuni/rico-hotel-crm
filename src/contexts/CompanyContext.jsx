import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'hotelos-current-company-id'

// 会社コンテキスト(Foundation v1.0是正: 会社管理完成) — 以前は
// DAIEI_COMPANY_IDという固定UUIDがコード中にハードコードされており、
// 2社目を追加してもコード変更なしには使えなかった。ここでは
// companiesテーブルを実際に読み、現在operatingしている会社IDを
// 供給する。会社が1社しか無ければ自動的にその1社を使うため、
// 現状の挙動は変わらない — 2社目が追加された時点で「会社切替」が
// 実際に機能するようになる(会社管理画面から切替可能)。
const CompanyContext = createContext({
  companyId: null, company: null, companies: [], loading: true, setCompanyId: () => {}, refresh: () => {},
})

export function CompanyProvider({ children }) {
  const { user } = useAuth()
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const { data, error } = await supabase.from('companies').select('*').order('created_at')
    if (error) { console.error('[CompanyContext] load failed:', error); setLoading(false); return }
    setCompanies(data ?? [])
    setCompanyIdState(prev => {
      // 保存済みIDが実在しない/未設定なら先頭の会社(唯一の会社を含む)へ。
      if (prev && data?.some(c => c.id === prev)) return prev
      return data?.[0]?.id ?? null
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    load()
    const channel = supabase
      .channel(`realtime:companies:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, load])

  const setCompanyId = (id) => {
    setCompanyIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const company = companies.find(c => c.id === companyId) || null

  return (
    <CompanyContext.Provider value={{ companyId, company, companies, loading, setCompanyId, refresh: load }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCurrentCompany = () => useContext(CompanyContext)
