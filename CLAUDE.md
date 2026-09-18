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
- **UI ile ilgili bir öneri istendiğinde her zaman 3-5 alternatif
  görsel öneri hazırla** (Artifact olarak yayınlanmış, uygulamanın
  gerçek renk/font/kart diliyle çizilmiş mockup'lar), kullanıcı birini
  seçmeden uygulamaya geçme. Mockup dosyalarını `scratch/` altında
  üret; yayınladıktan sonra sil, repo'ya commit etme.

## Bu ortamda (remote/CLI sandbox) test etme notları

- Sistem `node` sürümü (`/opt/node22`) Angular CLI'nin istediği
  minimum sürümden bir patch geride olabilir ("Node.js version X
  detected... minimum v22.22.3" hatası). Çözüm: `/opt/nvm` altındaki
  nvm ile daha yeni bir sürüm kurup kullan:
  `export NVM_DIR=/opt/nvm/.nvm; source /opt/nvm/nvm.sh; nvm install 22.22.3; nvm use 22.22.3`.
- UI değişikliklerini görsel olarak doğrularken **`chrome --headless
  --screenshot=...` CLI bayrağını kullanma** — bu eski headless mod
  layout'u güvenilmez render ediyor (flex/overflow hesapları bozuk
  çıkabiliyor, örn. gerçekte taşmayan bir öğe taşıyormuş gibi
  görünebiliyor). Bunun yerine global kurulu Playwright'ı kullan:
  `require('/opt/node22/lib/node_modules/playwright')` ile
  `chromium.launch({ executablePath:
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:
  ['--no-sandbox'] })`, sonra `page.screenshot(...)` — bu, gerçek
  layout'u doğru yansıtıyor. `ignoreHTTPSErrors: true` proxy/CA
  sertifika hatalarını (Google Fonts vb. dış istekler) aşmak için
  gerekebilir.
