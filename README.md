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
