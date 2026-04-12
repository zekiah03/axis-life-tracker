// バーコードスキャンと Open Food Facts API ルックアップ。
// BarcodeDetector API (Chrome/Android) がメインパス。Web標準なので追加プラグイン不要。
// iOS Safari 18以降で実装予定だが未対応の環境は空配列を返す。

export interface BarcodeResult {
  rawValue: string
  format: string
}

export interface OpenFoodFactsResult {
  barcode: string
  name: string
  brand?: string
  calories?: number // per 100g
  protein?: number
  fat?: number
  carbs?: number
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(image: ImageBitmapSource): Promise<
          Array<{ rawValue: string; format: string; boundingBox?: DOMRectReadOnly }>
        >
      }
      getSupportedFormats?: () => Promise<string[]>
    }
  }
}

export function isBarcodeSupported(): boolean {
  if (typeof window === 'undefined') return false
  return typeof window.BarcodeDetector === 'function'
}

export async function createBarcodeDetector() {
  if (!isBarcodeSupported()) return null
  try {
    return new window.BarcodeDetector!({
      formats: [
        'ean_13',
        'ean_8',
        'upc_a',
        'upc_e',
        'code_128',
        'code_39',
        'codabar',
        'qr_code',
      ],
    })
  } catch {
    return null
  }
}

// Open Food Facts の無料APIで商品情報を取得
// https://wiki.openfoodfacts.org/API/Read/Product
export async function fetchFromOpenFoodFacts(
  barcode: string
): Promise<OpenFoodFactsResult | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_ja,brands,nutriments`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null
    const p = json.product
    const nutri = p.nutriments || {}
    // 日本語名があればそれを優先
    const name = p.product_name_ja || p.product_name || 'Unknown'
    // 単位は per 100g を優先
    const calories =
      typeof nutri['energy-kcal_100g'] === 'number'
        ? nutri['energy-kcal_100g']
        : typeof nutri['energy-kcal'] === 'number'
        ? nutri['energy-kcal']
        : undefined
    return {
      barcode,
      name,
      brand: p.brands,
      calories,
      protein: typeof nutri.proteins_100g === 'number' ? nutri.proteins_100g : undefined,
      fat: typeof nutri.fat_100g === 'number' ? nutri.fat_100g : undefined,
      carbs: typeof nutri.carbohydrates_100g === 'number' ? nutri.carbohydrates_100g : undefined,
    }
  } catch (err) {
    console.error('[barcode] Open Food Facts lookup failed', err)
    return null
  }
}
