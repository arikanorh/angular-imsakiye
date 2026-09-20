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

## Test / önizleme pipeline'ları

İki ayrı yol var; **varsayılan Firebase preview kanalıdır.** Tailscale yolu
yalnızca kullanıcı açıkça "tailscale aç" dediğinde kullanılır.

### 1) Varsayılan: Firebase Hosting preview kanalı

Karmaşık/riskli değişikliklerde branch + PR açılır, ardından:

```bash
node scripts/generate-build-info.mjs && npx ng build --configuration production
firebase hosting:channel:deploy <kanal-adı> --expires 7d
```

Preview URL'si kullanıcıya verilir, onay gelmeden merge/prod deploy yapılmaz.
Deploy sonrası `src/app/build-info.ts` placeholder'a döndürülür
(`branch: 'unbuilt'`, `timestamp: 'unbuilt'`). Production build'inin
`ng serve`'i düşürebildiğini unutma; test için dev sunucusunu yeniden başlat.

### 2) "tailscale aç": canlı dev sunucusu (hot reload) — Tailscale Funnel

Kullanıcı bu ortamdaki `ng serve`'e kendi cihazından, hot reload ile
bağlanmak istediğinde. Cloudflare Quick Tunnel / ssh tünelleri bu
sandbox'ta çalışmaz (yalnızca proxy üzerinden 443 çıkışı var); Tailscale
proxy'yi kullanır. Kullanıcı bu yolu açıkça onaylamıştır; otomatik mod
"External Ingress Tunnel" uyarısı verirse kullanıcıya söyle, aşmaya çalışma.

```bash
PUBLIC=1 bash scripts/dev-remote.sh      # herkese açık Funnel URL'i
bash scripts/dev-remote.sh               # yalnızca tailnet içi (serve)
```

Script'in yaptıkları ve bilinen tuzaklar (2026-09-20'de çalışan yöntem):

- Tailscale ikilileri `/opt/tailscale` altına indirilir; durum
  `~/.tailscale-dev` dizininde tutulur. `tailscaled` **`--statedir`** ile
  başlatılmalı (yalnızca `--state` verilirse Funnel sertifikası üretilemez,
  "no TailscaleVarRoot" hatası).
- `tailscaled` ve `ng serve --allowed-hosts` **`setsid nohup … &`** ile ayrık
  başlatılır; aksi halde Bash çağrısı bitince süreçler ölür.
- İlk girişte script bir `https://login.tailscale.com/a/…` bağlantısı
  basar; kullanıcı tarayıcıda onaylar. `TS_AUTHKEY` ortam değişkeni varsa
  sessiz giriş yapılır. Kimlik `~/.tailscale-dev/tailscaled.state`'te kalır,
  oturum boyunca yeniden giriş gerekmez.
- Tailnet'te **Serve ve Funnel bir kez etkinleştirilmiş** olmalı (kullanıcı
  2026-09-20'de açtı). Kapalıysa komut bir etkinleştirme bağlantısı basar.
- Beklenen adres: `https://imsakiye-dev.<tailnet>.ts.net` (bu tailnet için
  `imsakiye-dev.tailb082d7.ts.net`). Sertifikayı önceden üretmek için
  `tailscale --socket=~/.tailscale-dev/tailscaled.sock cert <adres>`
  çalıştır, ardından `curl` ile HTTP 200 doğrula.
- Kapatmak: `tailscale --socket=… funnel --https=443 off` (ya da
  `serve reset`), gerekirse `tailscaled`'i PID ile durdur.
- **`pkill -f` tuzağı:** kalıp metni çalışan Bash komutunun kendi satırında
  da geçerse kabuk kendini öldürür (çıkış kodu 144). Süreçleri PID ile
  ya da komut satırında geçmeyen bir kalıpla durdur; başlatma ve durdurma
  komutlarını aynı çağrıya koyma.
