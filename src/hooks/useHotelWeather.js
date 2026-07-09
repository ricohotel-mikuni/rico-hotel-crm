import { useEffect, useState } from 'react'
import { HOTEL_COORDS } from '../ai/weatherInsight'

const ENDPOINT =
  `https://api.open-meteo.com/v1/forecast?latitude=${HOTEL_COORDS.lat}&longitude=${HOTEL_COORDS.lon}` +
  `&current=temperature_2m,weather_code&daily=precipitation_probability_max,temperature_2m_max&timezone=Asia%2FTokyo`

// リコホテル三国の固定座標の天気を取得する(Open-Meteo — APIキー不要・
// 無料の公開気象データ。外部AI APIではなく単なる気象データ取得のため
// AI開発憲章の「外部AI API不使用」方針には抵触しない)。取得できな
// かった場合は`error`を立てるだけで、呼び出し側(PropertyHub)がダミー
// 表示へフォールバックできるようにする — 天気情報が無くてもダッシュ
// ボードの他の機能は問題なく動く(AI開発憲章「AIが利用不可でもコア
// 業務は全機能する」の縮退動作方針に沿う)。
export function useHotelWeather() {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let cancelled = false
    fetch(ENDPOINT)
      .then(res => { if (!res.ok) throw new Error('weather fetch failed: ' + res.status); return res.json() })
      .then(json => {
        if (cancelled) return
        setState({
          loading: false, error: null,
          data: {
            tempNow: json.current?.temperature_2m,
            code: json.current?.weather_code,
            tempMax: json.daily?.temperature_2m_max?.[0],
            precipProb: json.daily?.precipitation_probability_max?.[0],
          },
        })
      })
      .catch(err => {
        if (cancelled) return
        console.error('[useHotelWeather] failed:', err)
        setState({ loading: false, error: err, data: null })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
