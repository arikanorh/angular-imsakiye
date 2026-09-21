# Hatırlatmalar (Web Push) — Uygulama Planı

Sahura ve iftara X dakika kala bildirim. Uygulama kapalıyken de çalışması
için sunucudan gönderilen Web Push kullanılır. Hesap yok; yalnızca cihazın
push aboneliği, şehir ve tercihler saklanır.

**Kararlar**
- Varsayılanlar: sahur 30 dk, iftar 15 dk, iftar anında sistem sesi açık.
- Seçenekler: sahur Kapalı / 45 / 30 / 15 dk; iftar Kapalı / 15 / 5 dk.
- Veri Firestore'da `subscriptions/{id}` (id = abonelik uç noktasının hash'i).
  Ramazan bitişinden 7 gün sonra tüm kayıtlar silinir.
- iOS'ta yalnızca ana ekrana eklenmiş PWA'da çalışır (iOS 16.4+); Ayarlar
  bunu tek satırla söyler ve "Ana ekrana ekle"ye yönlendirir.
- Yedek yol: bildirim izni vermeyen kullanıcı için `.ics` takvim dışa aktarımı
  (ayrı iş, Öneri 5).

Durum işaretleri: `[ ]` bekliyor · `[~]` sürüyor · `[x]` bitti

---

## Faz 0 — Ön koşullar (yarım gün)

- [ ] **(Siz)** Firebase `imsa-kiye` projesini Blaze planına al. Zamanlanmış
      Cloud Function (Cloud Scheduler) bunu gerektirir; bu ölçekte maliyet
      sıfıra yakın.
- [ ] **(Siz)** Firestore'u etkinleştir (Native mode, `europe-west1` ya da
      `eur3`).
- [ ] **(Claude)** VAPID anahtar çifti üret (`npx web-push generate-vapid-keys`).
      Public key `src/environments`'a, private key Functions secret'ına
      (`firebase functions:secrets:set VAPID_PRIVATE_KEY`). Private key
      sohbete yazılmaz.
- [ ] **(Siz)** Test cihazları: Android Chrome, masaüstü Chrome, iPhone
      (iOS 16.4+, uygulama ana ekrana eklenmiş).

**Bitti ölçütü:** Firebase konsolunda Blaze + Firestore açık, secret kayıtlı.

## Faz 1 — Ayarlar sayfası (1 gün, branch + PR + preview)

- [ ] "Hakkında" alt sayfası "Ayarlar" olur; üst kartta şehir seçicinin
      solunda dişli düğmesi (uzun basış da çalışmaya devam eder).
- [ ] Satırlar: Sahur hatırlatması (Kapalı/45/30/15), İftar hatırlatması
      (Kapalı/15/5), İftar vaktinde ses (anahtar), Gece modu (mevcut),
      Zaman simülasyonu (mevcut), Şehir, Sürüm/Build.
- [ ] Tercihler `localStorage`'da (`imsakiye-reminders`); sunucuya Faz 2'de
      gider.
- [ ] iOS + Safari sekmesi (standalone değil) ise hatırlatma satırlarının
      altında uyarı: "Bildirim için uygulamayı ana ekrana ekleyin."
- [ ] Bildirim desteklenmiyorsa (`'PushManager' in window` yoksa)
      hatırlatma satırları pasif, açıklama satırı.
- [ ] Playwright: 375/390/430 px'te sayfa taşmıyor; anahtarlar tercihleri
      yazıyor.

**Bitti ölçütü:** preview kanalında Ayarlar açılıyor, tercihler kalıcı.

## Faz 2 — Push aboneliği (1 gün, aynı PR ya da ikinci PR)

- [ ] `ReminderService`: Angular `SwPush` ile `requestSubscription`
      (VAPID public key). İzin yalnızca bir hatırlatma anahtarı **açılırken**
      istenir; reddedilirse anahtar kapanır ve nedeni gösterilir.
- [ ] Abonelik + şehir + tercihler Firestore'a yazılır:
      `{ endpoint, keys, city, sahurMin, iftarMin, sound, ua, updatedAt }`.
      Belge id = `sha256(endpoint)`.
- [ ] Şehir ya da tercih değişince belge güncellenir; tüm hatırlatmalar
      kapanınca `unsubscribe` + belge silinir.
- [ ] Her açılışta abonelik doğrulanır (`pushManager.getSubscription`);
      yoksa/değişmişse yeniden kaydedilir.
- [ ] Firestore güvenlik kuralları: `subscriptions` için `read: false`;
      `create/update/delete` yalnızca belge id'si istek gövdesindeki
      endpoint hash'iyle eşleşiyorsa. Alan tipleri ve uzunlukları kurallarda
      doğrulanır.
- [ ] Ayarlar'da "Deneme bildirimi gönder" düğmesi (Faz 3'teki test
      fonksiyonunu çağırır).

**Bitti ölçütü:** Android Chrome'da anahtar açılıyor, Firestore'da belge
görünüyor, kapatınca siliniyor.

## Faz 3 — Cloud Function: zamanlayıcı ve gönderim (1 gün)

- [ ] `functions/` (Node 20, TypeScript). İmsakiye verisi tek kaynaktan:
      `src/app/imsakiye.ts` build'de `functions/src/imsakiye.json`'a
      üretilir (script `scripts/export-imsakiye.mjs`), elle kopya yok.
- [ ] `sendReminders`: her dakika (`every 1 minutes`, `Europe/Istanbul`).
      Her şehir için günün sahur/iftar dakikası hesaplanır; abonelik
      tercihleriyle `now == vakit - offset` eşleşenlere gönderim.
      Aynı dakika çift gönderimi önlemek için belgeye `lastSent` yazılır.
- [ ] Gönderim `web-push` kütüphanesiyle, VAPID private key secret'tan.
      404/410 dönen abonelik silinir; diğer hatalar loglanır.
- [ ] Payload: `{ title: "İftara 15 dakika · Çorlu", body: "İftar 18:42 ·
      Hayırlı iftarlar", tag: "iftar-2027-02-10", url: "/" }`. Sahur için
      "Sahura 30 dakika · Çorlu / İmsak 6:37". İftar anı için ayrı gönderim
      (`offset 0`, `sound: true` ise `vibrate` alanı).
- [ ] `sendTestReminder` (callable/HTTPS): gövdedeki endpoint hash'ine tek
      deneme bildirimi; Ayarlar'daki düğme bunu çağırır. Dakikada 1 istek
      sınırı.
- [ ] `cleanupSubscriptions`: günlük; Ramazan bitişi + 7 gün sonra tüm
      belgeleri siler; 30 gün güncellenmemiş belgeleri siler.
- [ ] Emulator ile yerel test (`firebase emulators:start --only
      functions,firestore`), zaman simülasyonu için fonksiyona `now`
      parametresi (yalnızca emulator'da kabul edilir).

**Bitti ölçütü:** emulator'da sahte "now" ile doğru abonelikler seçiliyor,
gerçek cihaza deneme bildirimi düşüyor.

## Faz 4 — Service worker ve bildirim davranışı (yarım gün)

- [ ] Angular `ngsw` bildirimi gösteriyor; `notificationclick` ile
      `url`'e odaklanma/açma (`SwPush.notificationClicks`).
- [ ] İkon `assets/apple.png` (192px), rozet için tek renk küçük ikon
      (`assets/badge.png`, 96px, yeşil monogram).
- [ ] `tag` ile aynı vaktin bildirimleri üst üste binmez (yenisi eskisini
      değiştirir).
- [ ] `manifest.webmanifest`: `display: standalone`, `start_url: /`,
      `id` alanı; iOS için `apple-mobile-web-app-*` meta'lar zaten var.

**Bitti ölçütü:** bildirime dokununca uygulama açılıyor, çift bildirim yok.

## Faz 5 — Test (1 gün)

- [ ] Android Chrome: sekme kapalı, ekran kapalı; 30 dk / 15 dk / iftar anı.
- [ ] Masaüstü Chrome: tarayıcı açık, uygulama sekmesi kapalı.
- [ ] iPhone ana ekran PWA: izin akışı, bildirim gelişi, dokunma; Safari
      sekmesinde uyarının göründüğü.
- [ ] Zaman doğruluğu: 10 örnekte gönderim dakikası ile hedef dakika farkı
      ≤ 60 sn (Functions logları).
- [ ] Şehir değiştirince eski şehrin bildirimi gelmiyor.
- [ ] Tüm anahtarlar kapatılınca Firestore belgesi siliniyor, bildirim
      gelmiyor.
- [ ] Preview kanalı + kullanıcı onayı, sonra merge ve prod.

**Bitti ölçütü:** üç platformda da bildirimler geldi; sapma ≤ 60 sn.

## Faz 6 — Yayın ve izleme (yarım gün)

- [ ] Prod deploy (`firebase deploy --only hosting,functions,firestore:rules`).
- [ ] Functions loglarında hata alarmı (Cloud Logging tabanlı e-posta).
- [ ] Maliyet kontrolü: Ramazan'ın ilk haftasında Firebase faturası.
- [ ] README ve CLAUDE.md: mimari özeti, secret adı, emulator komutu.

---

## Sıra ve bağımlılıklar

```
Faz 0 (Siz: Blaze, Firestore, cihazlar)
  └─► Faz 1 Ayarlar ─► Faz 2 Abonelik ─► Faz 3 Function ─► Faz 4 SW ─► Faz 5 Test ─► Faz 6 Yayın
```

Toplam yaklaşık 5 iş günü. Faz 1 Faz 0 beklemeden başlayabilir; Faz 2'nin
Firestore yazımı ve Faz 3 Blaze/Firestore'a bağlıdır.

## Riskler

- iOS'ta kullanıcıların çoğu Safari sekmesinden açıyorsa bildirim
  ulaşmaz; Öneri 5'teki "ana ekrana ekle" şeridi bu yüzden Faz 1'e alınabilir.
- Push teslim gecikmesi tarayıcı servisine bağlıdır; 5 dk seçeneği en
  hassas olanıdır, testte ayrıca ölçülür.
- Blaze planı kart gerektirir; bütçe uyarısı (örn. 5 USD) Faz 0'da kurulur.
