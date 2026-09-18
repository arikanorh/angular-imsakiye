# angular-imsakiye

Basit bir Angular uygulaması: Çorlu/İstanbul/Manisa için Ramazan
iftar-sahur vakitlerini gösterir. Firebase Hosting'e (`imsa-kiye`
projesi, https://imsa-kiye.web.app) deploy ediliyor — bkz. README.md
(geliştirme, build ve deploy adımları için).

## Kurallar

- **Her commit'ten önce `package.json`'daki `version` alanını
  yükselt** (patch artışı, örn. `0.0.1` -> `0.0.2`), kod değişikliği
  ne kadar küçük olsa da. Bu sürüm, sayfanın sağ altındaki build
  bilgisi rozetinde (`src/app/build-info.ts`, `scripts/generate-build-info.mjs`
  tarafından her build öncesi otomatik üretilir) gösteriliyor.
- **Karmaşık istekler bir branch'te (+ PR) yapılır; basit/küçük
  istekler doğrudan `master`'a commit edilip push'lanır.**
- **Karmaşık/riskli değişiklikler kullanıcı test etmeden merge
  edilmez.** Production'a (`imsa-kiye.web.app`) deploy etmeden önce
  bir Firebase Hosting preview channel'ına deploy et
  (`firebase hosting:channel:deploy <isim>`), preview URL'sini
  kullanıcıya ver, onay gelmeden merge/production deploy yapma.
