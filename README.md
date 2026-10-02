# Restoran QR Menü ve Sipariş Sistemi

Müşterilerin masadaki QR kodu okutarak menüyü inceleyip sipariş verebildiği, siparişini canlı takip edebildiği Next.js (App Router) uygulaması. Müşteri sayfası `src/app/page.tsx` dosyasındadır.

**Stack:** Next.js, TypeScript, Tailwind CSS, Lucide React, Supabase (veritabanı + Realtime).

## Özellikler

- Masa numarası URL'den alınır: `/?masa=5` veya `/?table=5` (varsayılan `1`).
- Kategori chip'leri, canlı arama popover'ı (en az 2 karakter) ve Acılı / Vejetaryen / Glutensiz filtreleri.
- 1.5 porsiyon / Duble fiyatı olan ürünler için porsiyon seçimli detay modalı ve ürün notu.
- Sepet LocalStorage'da (`cart_table_<masa>`) kalıcıdır; mutfak notu ile sipariş `orders` tablosuna `pending` olarak yazılır.
- Aktif sipariş (`active_order_id_table_<masa>`) sayfa yenilense de geri yüklenir; Supabase Realtime ile `preparing` / `completed` durumları anlık yansır. Sipariş tamamlanınca 3.5 sn kutlama gösterilir, takip çubuğu kalkar ve kayıt temizlenir.
- Garson çağır / Hesap iste butonlarında 60 sn spam kilidi (`cooldown_waiter_<masa>`, `cooldown_bill_<masa>`); istekler `table_calls` tablosuna yazılır.

## Çalıştırma

```bash
npm install
cp .env.example .env.local   # Supabase bilgilerinizi girin
npm run dev -- -p 4317
```

Ardından <http://localhost:4317/?masa=5> adresini açın.

Supabase tabloları için `supabase/schema.sql` dosyasını SQL Editor'da çalıştırın.

> `.env.local` tanımlı değilse uygulama **demo modunda** açılır: örnek menü gösterilir ve sipariş durumu (alındı, hazırlanıyor, hazırlandı) yerel olarak simüle edilir.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run lint` | ESLint |
