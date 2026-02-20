# Kafe POS — React Native / Expo Frontend

## Proje Yapısı

```
cafe-pos-frontend/
├── App.js                        ← Giriş ekranı + navigation kök
├── app.json                      ← Expo config
├── package.json
├── babel.config.js
└── src/
    ├── constants/
    │   └── theme.js              ← Renk, font, radius, shadow sistemi
    ├── services/
    │   └── api.js                ← Tüm backend çağrıları (Axios)
    ├── hooks/
    │   └── usePolling.js         ← 3 saniyede bir yenileme hook'u
    ├── screens/
    │   ├── TablesScreen.js       ← Masa grid, polling, renk mantığı
    │   ├── OrderScreen.js        ← Ürün grid + sepet (tablet split layout)
    │   └── AdminScreen.js        ← Ürün yönetimi + raporlar
    └── components/
        ├── PinModal.js           ← 4 haneli PIN girişi
        └── PaymentModal.js       ← Alman usulü ödeme
```

---

## Kurulum

### 1. Bağımlılıkları yükle
```bash
npm install
```

### 2. IP adresini güncelle
`src/services/api.js` dosyasındaki `BASE_URL`'i kendi sunucunuzun IP'siyle değiştirin:
```js
export const BASE_URL = 'http://192.168.1.XXX:8000/api';
```

IP'nizi bulmak için:
- **Mac/Linux**: `ifconfig | grep "inet "`
- **Windows**: `ipconfig`

### 3. Admin PIN'ini değiştir (opsiyonel)
`src/components/PinModal.js` dosyasında:
```js
const ADMIN_PIN = '1234'; // ← bunu değiştirin
```

### 4. Başlat
```bash
npx expo start
```

Expo Go uygulamasıyla QR kodu okutun veya simülatörde çalıştırın.

---

## Özellikler

### TablesScreen
- 14 masa otomatik yüklenir (backend'den)
- **3 saniyede bir** otomatik yenileme (polling)
- Ekran genişliğine göre responsive grid:
  - `< 480px` → 2 sütun (telefon dikey)
  - `480–768px` → 3 sütun (telefon yatay / küçük tablet)
  - `>= 768px` → 4 sütun (tablet)
- Masa renkleri: Boş=Yeşil, Dolu=Kırmızı, Misafir=Mor, Teslimat=Mavi
- Amber nokta = aktif sipariş var
- Admin butonu → PIN modal → Admin ekranı

### OrderScreen
- **Tablet** (`>= 700px`): Sol=ürünler, Sağ=sepet (side-by-side)
- **Telefon**: Alt=sepet, Üst=ürünler (stacked)
- Kategoriler yatay scroll
- Ürüne basınca direkt backend'e POST (local cart yok)
- Ürün badge'i: sepetteki miktar gösterilir
- Miktar +/- ile artır/azalt; 0 olunca item silinir
- Kısmi ödeme gösterimi (ödendi / kalan)

### PaymentModal (Alman Usulü)
- Her ürün için ayrı ayrı miktar seçimi
- Toplam backend'den gelen `price_at_order` ile hesaplanır
- Kullanıcı elle tutar giremez
- **Fiş Kesildi** checkbox olmadan ödeme butonu aktif olmaz
- Nakit / Kart iki ayrı buton
- Kısmi ödeme: bakiye bitene kadar birden fazla ödeme yapılabilir

### AdminScreen (PIN korumalı)
| Tab | İçerik |
|-----|--------|
| Ürünler | Yeni ürün ekle, fiyat düzenle, aktif/pasif toggle |
| Kategoriler | Yeni kategori ekle, listeyi gör |
| Günlük Rapor | Tarih seç → Ciro, Nakit, Kart, Ürün dökümü |
| Aylık Rapor | Yıl/Ay seç → aynı veriler |

---

## Renk Referansı

| Değişken | Renk | Kullanım |
|----------|------|----------|
| `C.bgDark` | #1C1209 | Ana arka plan (espresso) |
| `C.bgMid` | #2A1E0F | Kartlar |
| `C.amber` | #F59E0B | Birincil aksiyon, fiyatlar |
| `C.green` | #22C55E | Boş masa |
| `C.red` | #EF4444 | Dolu masa |
| `C.purple` | #A855F7 | Misafir masa |
| `C.blue` | #3B82F6 | Teslimat masa |

---

## Gereksinimler

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go (iOS/Android) veya simülatör
- Backend sunucu çalışır durumda

## Backend Bağlantı Sorunları

Cihaz ve sunucu **aynı Wi-Fi ağında** olmalı.
`BASE_URL`'de `localhost` kullanmayın — cihazdan erişilemez.
Sunucuyu `0.0.0.0:8000` ile başlatın: `python manage.py runserver 0.0.0.0:8000`
