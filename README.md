# angular-imsakiye

[Edit on StackBlitz ⚡️](https://stackblitz.com/edit/angular-imsakiye)

## Geliştirme

```
npm install
npm start          # http://localhost:4200
```

## Build

```
npm run build -- --configuration production
```

Çıktı `dist/demo` altına yazılır (`index.html` doğrudan bu klasörde,
alt klasör yok — Firebase Hosting bu düz yapıyı bekliyor).

`npm run build`/`npm start`, çalışmadan önce (`prebuild`/`prestart`)
`scripts/generate-build-info.mjs`'i tetikleyip `src/app/build-info.ts`'i
`package.json`'daki sürüm ve o anki zaman damgasıyla yeniden üretir;
bu değer arayüzde sağ altta küçük bir rozet olarak gösterilir. Bu dosya
her build'de değiştiği için commit etmeye gerek yok (yalnızca ilk
checkout'ta derlemenin bozulmaması için yer tutucu bir değerle
repoya dahil edildi).

## Firebase Hosting'e deploy

Proje **imsa-kiye** Firebase projesine deploy ediliyor (bkz.
`firebase.json`, `.firebaserc`). Canlı adres: https://imsa-kiye.web.app

### Ön koşullar (bir kere)

```
npm install -g firebase-tools
firebase login
```

`firebase login`, tarayıcıda Google hesabınızla (bu projeye erişimi
olan hesap) oturum açmanızı ister ve kimlik bilgilerini yerel
makinenizde saklar.

### Deploy

```
npm run deploy
```

Bu komut sırasıyla:
1. `ng build --configuration production` ile prod build alır
   (`prebuild` hook'u sayesinde build-info rozeti de güncellenir),
2. `firebase deploy --only hosting` ile `dist/demo`'yu Firebase
   Hosting'e yükler.

Deploy sonrası `https://imsa-kiye.web.app` üzerinden doğrulayın.

## Uzaktan geliştirme (hot reload ile)

Claude Code on the web sandbox'ında çalışan `ng serve`'e kendi
bilgisayarınızdan bağlanmak için `scripts/dev-remote.sh` kullanılır.
Sandbox dışarıya yalnızca proxy üzerinden 443/HTTPS çıkabildiği için
Cloudflare Quick Tunnel (7844/TCP+UDP) ve ssh tabanlı tüneller çalışmaz;
Tailscale ise kontrol düzlemi ve DERP relay için `HTTPS_PROXY`'yi
kullanır ve kullanıcı alanı ağıyla (TUN gerekmeden) çalışır.

```bash
bash scripts/dev-remote.sh
```

- Script Tailscale'i indirir, `ng serve --allowed-hosts` ve `tailscaled`'i
  başlatır, bir giriş bağlantısı basar. Bağlantıyı tarayıcıda açıp makineyi
  tailnet'inize ekleyin; ardından `tailscale serve` dev sunucusunu
  `https://imsakiye-dev.<tailnet>.ts.net` adresinde tailnet'e açar.
- Kendi bilgisayarınızda Tailscale kurulu değilse `PUBLIC=1` ile Funnel
  kullanın (herkese açık HTTPS adresi; tailnet ACL'inde Funnel açık olmalı).
- Her yeni sandbox oturumunda giriş yenilenir. Sessiz giriş için Tailscale
  yönetim panelinden geçici (ephemeral, reusable) bir auth key üretip
  ortamın **environment variables** ayarına `TS_AUTHKEY` olarak ekleyin;
  anahtarı sohbete yapıştırmayın.
- Claude Code otomatik modda dış tünel açmayı onaysız yapmaz; scripti
  Claude'un çalıştırması için `.claude/settings.json`'a
  `"permissions": {"allow": ["Bash(bash scripts/dev-remote.sh*)"]}` kuralı
  eklemek ya da komutu kendiniz çalıştırmak gerekir.
- `--allowed-hosts` şarttır: Angular'ın Vite tabanlı dev sunucusu yabancı
  host adından gelen istekleri aksi halde reddeder. Hot reload (Vite HMR
  websocket'i) aynı adres üzerinden çalışır.
- Alternatif: ngrok da HTTP proxy destekler (`proxy_url` ayarı) ama hesap
  ve `NGROK_AUTHTOKEN` gerektirir, ücretsiz katmanda ilk ziyarette uyarı
  sayfası gösterir.
