# Hockey Tactics Board for iPad og Safari

Taktikktavlen er en installerbar nettapp på norsk bokmål. Den bruker den samme 60 × 30 m-banen, spillerpanelet og arbeidsflyten som Android-versjonen. Appen bruker lokale filer og krever ingen konto, API-er eller eksterne ressurser ved bruk.

## Fra Windows til Hjem-skjermen på iPad

Adressen `http://127.0.0.1:4173/hockey-demo/` er en forhåndsvisning på PC-en. På iPaden bruker du **HTTPS-lenken fra GitHub Pages**. Har du allerede en fungerende Pages-lenke til Hockeytavle, kan du gå rett til del 3.

### 1. Koble nettappen til HockeyAppIpad

På denne PC-en ligger Git-roten til den opprinnelige prosjektmappen i `VisualStudioCode_Bibliotek`. GitHub Desktop viser derfor også de andre prosjektene og byggeverktøyene. Hvis du ser `.hockey-build` eller flere tusen endringer i GitHub Desktop, stopp før **Commit** og **Push**.

1. I GitHub Desktop velger du **File → Clone repository** og finner **HockeyAppIpad** på fanen **GitHub.com**.
2. Velg en ny lokal mappe utenfor `VisualStudioCode_Bibliotek`, for eksempel `C:\Users\thof\Documents\GitHub\HockeyAppIpad`, og trykk **Clone**.
3. Åpne publiseringsmappen `C:\Users\thof\VisualStudioCode_Bibliotek\HockeyAppIpad_GitHub` i Filutforsker. Kopier **innholdet** i mappen, inkludert `.github`, `.gitignore` og `web`, til den klonede mappen. Da ligger `.github/workflows/pages.yml` og `web/src` direkte under repositoriets rot.
4. Velg den nye klonen i GitHub Desktop. Bruk gjerne **Repository → Show in Explorer** for å sjekke at den peker til mappen under `Documents\GitHub`. Kontroller at endringslisten viser nettappens filer.
5. Skriv `Legg til Hockeytavle for iPad` i **Summary**, og trykk **Commit to main** eller **Commit to …**. Trykk **Push origin**. Fortsett deretter til del 2.

[GitHubs veiledning for å klone et repositorium](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-a-repository-from-github-to-github-desktop)


### 2. Slå på GitHub Pages og finn lenken

1. På GitHub går du til **Settings → Pages** i repositoriet.
2. Under **Build and deployment → Source** velger du **GitHub Actions**.
3. Gå til **Actions** øverst i repositoriet. Klikk **Publish Hockey Tactics Board** i listen til venstre. Trykk **Run workflow**, velg standardgrenen, vanligvis `main`, og trykk den grønne **Run workflow**-knappen. Gjør dette også hvis en tidligere kjøring feilet før Pages ble slått på.
4. Vent til kjøringen har grønt hakemerke. Gå tilbake til **Settings → Pages** og klikk **Visit site**, eller kopier adressen ved meldingen om at nettstedet er publisert. Den vil typisk se slik ut:

   ```text
   https://DITT-BRUKERNAVN.github.io/hockey-tactics-board/
   ```

5. Åpne lenken på PC-en først. Når du ser selve ishockeybanen, åpner du samme lenke i Safari på iPaden.

[GitHubs veiledning for Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### 3. Legg Hockeytavle på Hjem-skjermen

1. Åpne Pages-lenken i **Safari** på iPaden mens den er koblet til internett.
2. Trykk på **Del**, firkanten med pil opp. Bla ned i menyen og trykk **Legg til på Hjem-skjerm**. På noen iPadOS-versjoner ligger valget under **Vis mer**.
3. Hvis bryteren **Åpne som nettapp** vises, slå den på. Trykk **Legg til**.
4. Gå til Hjem-skjermen og trykk på det nye ikonet **Hockeytavle**.
5. Vent til det står **Klar for frakoblet bruk** nederst i appen. Gjør dette første gang du åpner appen fra selve ikonet mens du fortsatt har nett.

[Apples veiledning for å legge til en nettapp](https://support.apple.com/en-ca/guide/ipad/ipad8f1f7a29/ipados)

### 4. Prøv at installasjonen virker uten nett

1. Lukk Hockeytavle i appveksleren.
2. Slå på flymodus og kontroller at Wi-Fi er av.
3. Åpne **Hockeytavle** fra Hjem-skjermen. Hvis banen åpnes og du kan tegne og lagre, er nettappen klar til bruk uten nett.

Hvis Pages-lenken viser **404**, kontroller at kjøringen i **Actions** er grønn, og kopier lenken på nytt fra **Settings → Pages**. Hvis statusen i appen sier at den frakoblede kopien mangler filer, slå på nett og åpne appen igjen fra Hjem-skjermen. Vent på **Klar for frakoblet bruk** før du prøver flymodus på nytt.


## Kjør fra Visual Studio Code

Åpne mappen `HockeyTacticsBoard` i VS Code. Installer Node.js 22 eller nyere på Windows. Kjør fra prosjektroten:

```powershell
npm --prefix web test
npm --prefix web start
```

Åpne adressen som skrives ut, normalt `http://127.0.0.1:4173/hockey-demo/`. Serveren lytter på Windows-maskinen og prøver appen under en undermappe, slik GitHub Pages normalt gjør. Lokaltesten trenger ingen npm-pakker. For å bygge uten å starte serveren, kjør `npm --prefix web run build`. Resultatet ligger i `web/dist/`. Bruk en HTTP-server på localhost eller HTTPS hos en vert når du tester service worker.

## Bruk, prosjektfiler og iPad-begrensninger

- Tegn med én finger eller Apple Pencil. Ved bruk av Pencil får frihåndsstreken trykkvariasjon når Safari rapporterer pennetrykk gjennom Pointer Events. Støtte for viskelærknapper varierer. **Viskelær** i verktøylinjen fungerer med finger og Pencil, og fjerner bare berørte deler av frihåndsstreker. Linjer og piler fjernes som hele objekter.
- Bruk to fingre til å panorere og zoome. Hvis finger nummer to legges ned under en tegnebevegelse, avbrytes den uferdige streken. Velg **Flytt** for å dra et objekt eller for å velge det og bruke **Fjern spiller**, **Fjern puck** eller **Fjern tegning** i panelet.
- Prosjekter lagres automatisk i IndexedDB etter en fullført endring. Ta jevnlig sikkerhetskopi til **Filer**. Bruk **Eksporter → Eksporter prosjektfil** for gjeldende prosjekt eller **Bibliotek → Sikkerhetskopi av alle** for hele biblioteket. **Bibliotek → Importer fil** lager kopier av prosjektene i filen. Prosjektfilene er JSON-filer for denne nettappen. Room-databasen fra Android og prosjektlageret fra den native iPad-appen ligger i hver sin app.
- **Eksporter → Lagre PNG** lager PNG på 3200 × 1660. **Lagre PDF** lager liggende A4 med en høyoppløst gjengivelse av banen og valgfritt prosjektnavn og dato. På iPad finner du filene under Safari-nedlastinger i **Filer**. Hvis Safari åpner en forhåndsvisning, bruk **Del → Arkiver i Filer**. Begge formatene genereres lokalt.
- Safari kan fjerne nettsteddata ved sletting av nettleserdata eller ved lagringspress. Nettappen ber nettleseren om varig lagring der dette støttes. Eksporterte prosjektfiler kan brukes til gjenoppretting selv om nettsteddata slettes. [WebKits lagringsregler](https://webkit.org/blog/14403/updates-to-storage-policy/)

## Oppdater uten å miste prosjekter

Når en oppdatering er ferdig lastet ned, vises **Oppdater appen**. Fullfør den pågående streken før du trykker. Appen venter på lagring, bytter service worker og laster inn den nye versjonen. Oppdateringen bytter bare appens hurtigbuffer. Prosjektbiblioteket beholdes i IndexedDB.

## Frakoblet test på iPad

1. Installer nettappen, åpne den fra Hjem-skjermen mens du er på nett og vent på **Klar for frakoblet bruk**.
2. Opprett prosjektet «Flymodustest». Tegn en strek, legg til en spiller og eksporter en prosjektfil til **På min iPad** i Filer.
3. Lukk nettappen fra appveksleren. Aktiver flymodus, og kontroller at Wi-Fi også er av.
4. Åpne Hockeytavle fra Hjem-skjermen. Kontroller at appen starter, viser at den er klar for frakoblet bruk og åpner «Flymodustest».
5. Tegn med finger, prøv Pencil hvis tilgjengelig, zoom med to fingre, fjern en spiller, visk midten av en frihåndsstrek og trykk **Angre**.
6. Eksporter PNG og PDF og åpne filene lokalt. Importer deretter prosjektfilen fra steg 2. En kopi skal dukke opp i biblioteket.
7. Lukk nettappen og åpne den på nytt i flymodus. Kontroller at endringene og importen er lagret.

Apple Pencil, Safari-nedlastinger, installasjon fra Safari og kaldstart fra Hjem-skjermen bør verifiseres på den aktuelle iPaden.

