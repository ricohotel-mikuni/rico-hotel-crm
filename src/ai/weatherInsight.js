// リコホテル三国(大阪市淀川区三国)の固定座標 — 閲覧者の位置情報ではなく
// 「ホテル所在地」の天気を常に表示する(承認済み: 拠点ダッシュボード
// ブラッシュアップ⑦、ユーザー選択「リコホテル三国の固定位置で取得」)。
// 位置情報の許可ポップアップを出さずに済むという利点もある。
export const HOTEL_COORDS = { lat: 34.75, lon: 135.47 }

// WMO weather code(Open-Meteoの`weather_code`)を絵文字・日本語ラベル・
// おおまかな種別(sunny/cloudy/rain/snow/storm/fog)へ変換する。天気の
// 種類ごとの厳密さより「NEOのコメント選択に十分な粒度」を優先している。
const WEATHER_CODE_MAP = {
  0: { emoji: '☀️', label: '晴れ', kind: 'sunny' },
  1: { emoji: '🌤', label: 'ほぼ晴れ', kind: 'sunny' },
  2: { emoji: '⛅', label: '晴れ時々くもり', kind: 'cloudy' },
  3: { emoji: '☁️', label: 'くもり', kind: 'cloudy' },
  45: { emoji: '🌫', label: '霧', kind: 'fog' },
  48: { emoji: '🌫', label: '霧', kind: 'fog' },
  51: { emoji: '🌦', label: '小雨', kind: 'rain' },
  53: { emoji: '🌦', label: '小雨', kind: 'rain' },
  55: { emoji: '🌦', label: '小雨', kind: 'rain' },
  61: { emoji: '🌧', label: '雨', kind: 'rain' },
  63: { emoji: '🌧', label: '雨', kind: 'rain' },
  65: { emoji: '🌧', label: '強い雨', kind: 'rain' },
  71: { emoji: '❄️', label: '雪', kind: 'snow' },
  73: { emoji: '❄️', label: '雪', kind: 'snow' },
  75: { emoji: '❄️', label: '強い雪', kind: 'snow' },
  80: { emoji: '🌦', label: 'にわか雨', kind: 'rain' },
  81: { emoji: '🌦', label: 'にわか雨', kind: 'rain' },
  82: { emoji: '🌧', label: '激しいにわか雨', kind: 'rain' },
  95: { emoji: '⛈', label: '雷雨', kind: 'storm' },
  96: { emoji: '⛈', label: '雷雨', kind: 'storm' },
  99: { emoji: '⛈', label: '激しい雷雨', kind: 'storm' },
}

export function describeWeatherCode(code) {
  return WEATHER_CODE_MAP[code] || { emoji: '🌡', label: '不明', kind: 'unknown' }
}

// 天気に応じたNEOのコメントをルールベースで生成する(外部AI APIは
// 呼ばない — AI開発憲章第6章のルールベース方針をDaiChat/daiGreetingと
// 同様に踏襲)。優先順位: 猛暑 > 荒天(雨・雷雨・雪) > 好天 > その他。
//
// `signals`は将来、稼働率・チェックイン件数・レビュー件数等の他の
// 業務データを組み合わせて一日の総合コメントを組み立てられるよう、
// 天気以外のヒントも受け取れる形にしてある(承認済み提案の「今後は
// システム内データも組み合わせて総合判断」という方針の土台)。今回は
// 天気のみを使うが、呼び出し側のシグネチャは変えずに済む。
export function weatherComment({ tempMax, code, precipProb }, signals = {}) {
  const { kind } = describeWeatherCode(code)

  if (typeof tempMax === 'number' && tempMax >= 33) {
    return '本日は非常に暑くなる予報です。熱中症対策として、冷たいウェルカムドリンクのご案内がおすすめです。'
  }
  if (kind === 'storm') {
    return '本日は雷雨の予報です。屋外設備の安全確認と、ご案内時の足元への注意喚起をおすすめします。'
  }
  if (kind === 'rain' || (typeof precipProb === 'number' && precipProb >= 50)) {
    return '本日は雨の予報です。フロントでは傘の貸出準備をおすすめします。'
  }
  if (kind === 'snow') {
    return '本日は雪の予報です。玄関周りの滑り止め対策をおすすめします。'
  }
  if (kind === 'sunny') {
    return '本日は天候が安定しています。観光のお客様の来館が期待できます。'
  }
  return '本日は穏やかな空模様です。通常通りのご案内で問題なさそうです。'
}
