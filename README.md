# AdlistQR - QR Tabanlı Garson Çağırma ve Sipariş Sistemi

AdlistQR, restoranlar için QR kod tabanlı garson çağırma ve sipariş sistemi sağlayan modern bir çözümdür. Mevcut Adlist POS sisteminizle gerçek zamanlı entegrasyon sunar.

## Özellikler
- **QR Kod ile Garson Çağırma**: Müşteriler, masalarındaki QR kodu okutarak anında garsonu çağırabilir.
- **Dijital Menü ve Sepet Yönetimi**: Ürünleri kategorilere ayrılmış şekilde inceleyebilir ve kolayca sepetlerine ekleyebilirler.
- **Sipariş Takibi ve Bildirimler**: Siparişin durumu (alındı, hazırlanıyor, hazır, servis edildi) hakkında anlık bildirim alırlar.
- **Adlist POS Gerçek Zamanlı Entegrasyon**: Verilen siparişler, anında Adlist POS sistemine ve mutfak ekranlarına düşer.
- **Responsive ve Kullanıcı Dostu Arayüz**: Tüm mobil cihazlarla uyumlu, basit ve şık bir arayüze sahiptir.
- **Masa Özelinde İşlemler**: Tüm işlemler, müşterinin oturduğu masaya özel olarak yürütülür.

## Kullanım Senaryoları
1. **Garson Çağırma**
   - Müşteri, masadaki QR kodu telefon kamerasıyla taratır.
   - Açılan web arayüzünde "Garsonu Çağır" butonuna tıklar.
   - İlgili garsonun veya personelin ekranına anlık bildirim düşer.

2. **Sipariş Verme**
   - Müşteri, QR kodu taratarak dijital menüye erişir.
   - Menüden istediği ürünleri seçerek sepetine ekler.
   - Sepeti onaylayarak siparişi gönderir.
   - Sipariş, anında Adlist POS sistemine ve mutfağa iletilir.

## Teknik Altyapı
- **Frontend:** HTML5, TailwindCSS, JavaScript (ES6 Modules)
- **Backend:** Supabase (Realtime Database & Functions)
- **Entegrasyon:** Adlist POS API
- **QR Kod Yönetimi:** QRCode.js

## Kurulum

Projeyi klonlayın ve bağımlılıkları yükleyin:
```bash
git clone https://github.com/1sthillman/adlistqr.git
cd adlistqr
npm install
```
Geliştirme sunucusunu başlatmak için:
```bash
npm run dev
```

## Yapılandırma

### 1. Supabase Entegrasyonu
`src/config.js` dosyasını kendi Supabase projenizin bilgileriyle güncelleyin:
```javascript
export default {
  SUPABASE_URL: 'https://<PROJE_ID>.supabase.co',
  SUPABASE_KEY: '<SUPABASE_ANON_KEY>',
  ADLIST_POS_API: 'https://adlist-pos-api.com/endpoint', // Opsiyonel: Adlist POS API adresiniz
  RESTAURANT_ID: 'your-restaurant-id' // İşletme Kimliğiniz
}
```

### 2. SQL Tablo Yapısı (Supabase)
Supabase projenizin SQL editöründe `supabase_setup.sql` dosyasının içeriğini çalıştırarak tabloları oluşturun:
```sql
-- Garson çağırma kayıtları
CREATE TABLE calls (
  id SERIAL PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  table_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' -- pending, acknowledged, completed
);

-- Sipariş kayıtları
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  table_id INTEGER NOT NULL,
  items JSONB NOT NULL,
  total_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'received' -- received, preparing, ready, served
);
```

### 3. QR Kod Oluşturma
Her masa için benzersiz QR kodlar oluşturun. URL yapısı aşağıdaki gibi olmalıdır. Yönetici panelinden bu işlemi otomatize edebilirsiniz.
```javascript
// Örnek URL yapısı
`https://adlistqr.com/?restaurant=${RESTAURANT_ID}&table=${TABLE_ID}`
```

## Sistem Mimarisi

```mermaid
graph TD
  A[Müşteri Cihazı] -->|QR Tarama| B[AdlistQR Web Arayüzü]
  B -->|Garson Çağır / Sipariş Ver| C[Supabase Realtime DB]
  C -->|DB Değişikliği Tetikler| D[Adlist POS Sistemi]
  D -->|Bildirim Gönder| E[Mutfak/Garson Ekranı]
  E -->|Durum Günceller| C
  C -->|Anlık Güncelleme| B
```

## Ekran Görüntüleri
1. **Ana Sayfa:** Masa bilgisi, "Garson Çağır" ve "Sipariş Ver" butonları.
2. **Menü Sayfası:** Kategorilere ayrılmış ürün listesi, arama ve filtreleme.
3. **Sepet:** Seçilen ürünler, adet düzenleme ve toplam tutar.
4. **Onay Ekranı:** Sipariş onayı ve canlı sipariş durumu takibi.

## Adlist POS Entegrasyonu
`src/app.js` içerisindeki `sendOrderToPOS` fonksiyonu, Adlist POS API'nize sipariş göndermek için bir şablon sunar.
```javascript
// Örnek sipariş gönderme fonksiyonu
async function sendOrderToPOS(orderData) {
  const response = await fetch(config.ADLIST_POS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Gerekirse API token'ınızı buraya ekleyin
      // 'Authorization': `Bearer ${POS_API_TOKEN}` 
    },
    body: JSON.stringify({
      restaurant: config.RESTAURANT_ID,
      table: orderData.table_id,
      items: orderData.items,
      timestamp: new Date().toISOString()
    })
  });
  return response.json();
}
```

## Canlı Demo
[https://adlistqr-demo.vercel.app/?restaurant=demo&table=5](https://adlistqr-demo.vercel.app/?restaurant=demo&table=5)

## Lisans
MIT License

---

**Yeni Repo Kurulum Komutları:**
```bash
echo "# adlistqr" >> README.md
git init
git add .
git commit -m "Proje başlangıcı: AdlistQR temel yapı ve dosyalar"
git branch -M main
git remote add origin https://github.com/1sthillman/adlistqr.git
git push -u origin main
``` #   a d l i s t q r  
 