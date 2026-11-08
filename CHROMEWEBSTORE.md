# Chrome Web Store Listing: Edge Trim

> Last Updated: 2026-11-08

Everything the Chrome Developer Dashboard asks for, ready to copy. The English texts below go straight into the form; the steps in Czech are for you.

## Postup pro aktualizaci 1.0.1 (co musíš udělat ty)

**Stav 2026-11-09:** koncept v Dashboardu je kompletní a ověřený po přenačtení stránky: balíček 1.0.1 (Draft Version 1.0.1), popisy ve všech 8 jazycích (přesná shoda se zdroji), nové snímky EN (globální) a CS, Privacy practices. Popisy, snímky a uložení udělal Claude přes Arc. Zbývá jen krok 7: **Submit for review**.

V obchodě je verze 1.0.0 (zveřejněná 2026-11-05, ověřeno na veřejné stránce obchodu 2026-11-08). Položka už existuje, takže nic nezakládáš znovu: nahraješ nový balíček a změníš jen to, co je níže. Všechno k nahrání je v `dist/chrome-web-store`.

1. **Nejdřív zásady ochrany soukromí na webu.** Nová verze stránky https://cleedek.com/edge-trim/privacy (EN + CS) musí být živá dřív, než odešleš ke kontrole: rozšíření teď umí poslat zprávu (formulář a stránka po odebrání), a kdyby zásady pořád tvrdily "nic se nesbírá", nesedělo by to s odpověďmi v Privacy practices. Hotovo 9. 11. 2026 (commit e1ebfd1 v cleedek-portfolio, živé EN i CS).
2. **Balíček:** https://chrome.google.com/webstore/devconsole → Edge Trim → **Package** → **Upload new package** → `dist/chrome-web-store/edge-trim-1.0.1.zip`. Oprávnění se nemění, takže se tě obchod nebude ptát na nová zdůvodnění.
3. **Store listing, angličtina:** v poli **Description** smaž starý text a vlož celý nový blok ze sekce Store Listing. **Screenshots:** smaž všech 5 starých a nahraj `screenshot-1.png` až `screenshot-5.png` z `1-globalni-en` v tomto pořadí (změnily se jen 1 a 3, ale takhle nemusíš hlídat pořadí). Ikona, dlaždice, video, kategorie a název zůstávají.
4. **Store listing, čeština:** nahoře v rozbalovacím seznamu jazyka vyber **Czech (čeština)**, vlož nový český popis ze sekce Česká verze obchodu a stejně vyměň snímky za ty z `2-cestina-cs`.
5. **Store listing, dalších 6 jazyků (nové v 1.0.1):** v rozbalovacím seznamu jazyka postupně vyber **Slovak**, **German**, **French**, **Spanish**, **Vietnamese** a **Chinese (China)** a do Description vlož celý obsah `store/descriptions/<jazyk>.txt` (sk, de, fr, es, vi, zh_CN). Snímky tam nenahrávej (u Subtitle Overlay mají další jazyky taky jen popis). Ulož všech 8 jazyků v jednom konceptu: u Subtitle Overlay 1.0.17 obchod hlásil "Mismatching metadata", když se popisy v jazycích rozcházely. Popisky v uvozovkách sedí přesně na texty rozšíření v daném jazyce, oprávnění jsou v Chromově znění. Překlady psal Claude, rodilý mluvčí je nekontroloval. Dashboard umí vyplnit i Claude přes Arc (nástroje v `~/subtitle-overlay/store/dashboard/`).
6. **Privacy practices:** v Data usage nech zaškrtnuté **Website content** a nově zaškrtni **Personally identifiable information** (nepovinný e-mail ve formuláři) a **Personal communications** (text zprávy). Tři prohlášení dole zůstávají zaškrtnutá. Single purpose, zdůvodnění oprávnění, Remote code (No) a odkaz na zásady se nemění. Podrobně v sekci Privacy & Data Use.
7. Klikni na **Save draft** a pak **Submit for review**. Balíček, texty, obrázky i Privacy practices jdou ke kontrole společně. Obchod nemá pole "co je nového", takže novinky lidi uvidí v popisu a v changelogu na cleedek.com.
8. **Až to projde:** řekni Claudovi, ať zapíše 1.0.1 do changelogu na cleedek.com (návrh je připravený, ale nepushnutý) a opraví tabulku Version History níže.

Video se měnit nemusí: ukazuje starší přepínač "Add shadow" pod obrázky (záběry 8 a 9), ale všechny funkce v něm platí. Pokud ho Filip bude chtít aktualizovat, nestačí ho jen přegenerovat: ty dva záběry by se musely předělat na nový přepínač nahoře v popupu, pak render (asi 2 minuty na jazyk) a nové nahrání na YouTube.

## Postup pro první vydání (2026-11-04, už hotové, jen pro informaci)

1. **Vývojářský účet:** stejný jako pro Subtitle Overlay (https://chrome.google.com/webstore/devconsole). Kontaktní e-mail je nastavený u účtu (Subtitle Overlay ho ukazuje). Klikni na **Add new item**.
2. **Zásady ochrany soukromí:** jsou online na https://cleedek.com/edge-trim/privacy (stránka `src/pages/[...lang]/edge-trim/privacy.astro` v repu cleedek-portfolio, stejně jako u Subtitle Overlay). Odkaz vlož do Privacy policy URL.
3. **Balíček:** nahraj `dist/chrome-web-store/edge-trim.zip`.
4. **Store listing:** vyplň texty níže (název a krátký popis si obchod vezme z balíčku, vyplňuješ hlavně Description a Category).
5. **Obrázky:** ze složky `1-globalni-en` nahraj `screenshot-1.png` až `screenshot-5.png` v tomto pořadí do Screenshots, `small-promo-tile-440x280.png` do Small promo tile a `marquee-promo-tile-1400x560.png` do Marquee promo tile. Dlaždice jsou podle Googlu společné pro všechny jazyky.
6. **Promo video (nepovinné):** nahraj `video-pro-youtube-en.mp4` na YouTube (stačí neveřejné) a odkaz vlož do pole pro video.
7. **Česká verze:** v Store listing nahoře v rozbalovacím seznamu jazyka vyber **Czech (čeština)**, vlož český popis ze sekce Česká verze obchodu, nahraj snímky ze `2-cestina-cs` a odkaz na české video (podrobně v té sekci).
8. **Ikona v obchodě:** do pole Store icon nahraj `store-icon-128.png`.
9. **Privacy:** vyplň podle sekcí Permissions Justification a Privacy & Data Use. U dat zaškrtni jen Website content.
10. **Distribution:** Visibility = Public, Regions = All regions, zdarma.
11. Klikni na **Submit for review**. Kvůli přístupu na všechny weby (`<all_urls>`) počítej s delší kontrolou.

Obrázky pro obchod se dělají ze šablon ve `store/src` (skutečný popup a fotka talíře z tvého dema). Znovu je uložíš příkazem `node store/render.mjs` (anglicky) nebo `node store/render.mjs cs` (česky). Video vyrobí `store/video/render-all.sh` (anglicky, asi 2 minuty) nebo `store/video/render-all.sh cs` (česky).

## Store Listing

**Extension Name**
Edge Trim

**Short Description** (119 of 132 characters, same as `_locales/en/messages.json`)
Crop transparent pictures right to their edge: drop, paste or right-click a picture. Everything stays on your computer.

**Detailed Description** (plain text: the store strips bold and links, so the ★ lines and CAPITAL headings do the highlighting, as in Subtitle Overlay's listing. Copy the whole block.)

```
Crop transparent pictures right to the edge of what's in them.

Edge Trim removes the empty space around cut-out photos, product shots and logos, so they line up in your layouts without fiddling with crops. Drop, paste or right-click a picture and get back a lossless PNG with the same name. Then add a drop shadow if you like. Everything happens on your computer.

★ THE HIGHLIGHTS
★ One drop: the empty space around a transparent picture is gone, the file name stays
★ Right-click any picture on a web page: trimmed and copied, or saved
★ Downloads arrive trimmed: turn it on once and every PNG, WebP, AVIF or GIF you download is trimmed
★ Pixels you can't see don't count: nearly invisible leftovers from background removal no longer make the crop too big
★ Add a drop shadow: five looks drawn from the picture's own outline, then fine-tune the light, colour and softness
★ Free and open source: no ads, no account, no picture ever uploaded

━━━━━━━━━━━━━━━━━━━━

TRIM IN THE POPUP
• Drop pictures into the popup, click to choose files, or paste a copied picture (⌘V / Ctrl+V)
• Each result shows its size before and after, for example 2000 × 2000 → 750 × 667 px, with Copy and Download next to it
• Several pictures at once? "Download all" saves them in one click, and "Open in a tab" gives you more room for big batches
• Click a trimmed picture to see it at full width
• The result is always a lossless PNG with the original name: "logo.png" stays "logo.png", "photo.webp" becomes "photo.png"

RIGHT FROM THE PAGE
• Right-click any picture and choose "Trim and copy image" or "Trim and save image"
• Right-click a download link and choose "Trim and download linked image" to get the full-size picture behind a small or watermarked preview
• A short note at the bottom of the page says what happened

DOWNLOADS ARRIVE TRIMMED
• Turn on "Trim downloaded pictures" (off by default) and every PNG, WebP, AVIF or GIF you download from a website is replaced by a trimmed copy with the same name
• It reacts to the finished download, so it also works after a countdown or a captcha (which you still get through yourself)
• JPEGs, animated pictures and pictures with nothing to trim stay as they are, and so does a download the site won't hand over a second time

CLEAN EDGES
• Keep: cuts right after the last pixel that isn't fully transparent, for an exact edge
• Trim haze: pixels under 2% opacity don't count, so nearly invisible leftovers from background removal don't stretch the crop. You can't see them, so nothing you can see is cut
• Trim more: also cuts soft shadows and glow (under 10% opacity); check the result, since the object's own soft edge can go too
• Fake transparency: when a stock or AI picture has the grey-and-white checkerboard painted in, rows and columns with nothing but the pattern are cut away too

ADD A DROP SHADOW (OPTIONAL)
• Switch to "Add shadow" at the top of the popup, add a picture and see it large, with its shadow
• Five looks to start from: Soft, Strong, Floating, Above and Side
• Advanced settings: the type (on a surface, floating or classic), where the light comes from, the colour (six to pick from, or any hex code), intensity, softness and distance; the previews follow every slider
• Check it on a white, grey, black or transparent background (only for looking: the file stays transparent)
• Save your favourite looks to "My shadows"
• "Download with shadow" gives you the picture with its shadow on a transparent background, cropped to where the shadow ends
• No AI: the shadow is drawn from the picture's own outline, on your computer

WORKS WITH
PNG, WebP, AVIF and GIF (the first frame). SVG isn't supported, and JPEG has no transparency to trim.

INTERFACE IN 8 LANGUAGES
English, Czech, Slovak, German, French, Spanish, Vietnamese and Chinese (Simplified). It follows your browser, or pick one at the bottom of the popup. A dark or light look, or the same as your browser.

PRIVACY
Every picture is trimmed on your computer and is never uploaded. There are no analytics, no ads and no accounts, and Edge Trim only remembers your settings, in your browser. The only thing that ever leaves it is a message you choose to send: through "Problem or idea?" in the popup, or on the short page that opens if you remove the extension. Details in the privacy policy.

PERMISSIONS
• "Read and change all your data on all websites": when you right-click a picture or a download link and choose an Edge Trim option, the extension loads that one picture from where the page points to it, and shows a short note on the page. With "Trim downloaded pictures" on, it loads a picture you have just downloaded once more from the same address. Otherwise it does nothing on a page.
• "Manage your downloads": to save the trimmed picture to your Downloads folder and, with "Trim downloaded pictures" on, to replace a download with its trimmed copy.

OPEN SOURCE
The whole extension is open source (GPL-3.0), so anyone can check exactly what it does: github.com/Cleedek/edge-trim. Plain JavaScript, with no build step and no dependencies.

PROBLEM OR IDEA?
Something not working, or missing a feature? "Problem or idea?" at the bottom of the popup sends me a message. I read every one.

SUPPORT THE CREATOR
Edge Trim is free and has no ads. If it saves you some fiddling with crops, the popup has a "Support the creator" page with Revolut, PayPal, Solana and Sui. Completely optional, and thank you!

Created with 💜 by Cleedek in Vietnam.
```

**Category**
Art & Design (in the store's Lifestyle group, chromewebstore.google.com/category/extensions/lifestyle/art; checked 2026-11-04). Alternative: Tools.

**Single Purpose**
Prepares transparent (cut-out) images: crops them to the edge of their visible content and can then add a shadow under them.

**Primary Language**
English

## Česká verze obchodu (lokalizace)

**Postup:** v Developer Dashboard otevři **Store listing**, nahoře v rozbalovacím seznamu jazyka vyber **Czech (čeština)** a vlož popis z bloku níže. Název a krátké shrnutí si obchod vezme z balíčku (`_locales/cs`), ty se tu nevyplňují.

**Obrázky:** ze složky `dist/chrome-web-store/2-cestina-cs` nahraj `screenshot-1.png` až `screenshot-5.png` v tomto pořadí. České video (`video-pro-youtube-cs.mp4`) nahraj na YouTube zvlášť a jeho odkaz vlož do pole pro video v české verzi: podle Googlu jde lokalizovat popis, snímky a video. Propagační dlaždice lokalizovat nejdou, takže česká `promo-tile.png` a `promo-marquee.png` ve `store/images/cs` obchod nepoužije a všude se ukážou anglické. Texty na obrázcích i ve videu používají stejné názvy tlačítek jako český popup a stejné položky menu jako český Chrome.

**Popis (Description):**

```
Ořízne průhledné obrázky přesně na hranu toho, co v nich je.

Edge Trim odstraní prázdné místo kolem vyříznutých fotek, produktových snímků a log, takže ti v návrzích sednou bez piplání s ořezem. Přetáhni, vlož nebo klikni pravým na obrázek a dostaneš zpátky bezeztrátové PNG se stejným názvem. Pak můžeš přidat stín. Všechno se děje v tvém počítači.

★ TO HLAVNÍ
★ Jedno přetažení: prázdné místo kolem průhledného obrázku zmizí, název souboru zůstane
★ Pravým tlačítkem na jakýkoli obrázek na webu: oříznutý a zkopírovaný, nebo uložený
★ Stažené obrázky rovnou oříznuté: zapneš to jednou a každé PNG, WebP, AVIF nebo GIF, které stáhneš, se ořízne
★ Pixely, které nejsou vidět, se nepočítají: téměř neviditelné zbytky po odstranění pozadí už ořez nezvětší
★ Přidej stín: pět vzhledů z obrysu samotného obrázku, pak dolaď světlo, barvu a měkkost
★ Zdarma a open source: bez reklam, bez účtu, žádný obrázek se nenahrává

━━━━━━━━━━━━━━━━━━━━

OŘEZ V POPUPU
• Přetáhni obrázky do popupu, klikni a vyber soubory, nebo vlož zkopírovaný obrázek (⌘V / Ctrl+V)
• U každého výsledku vidíš velikost před a po, třeba 2000 × 2000 → 750 × 667 px, a vedle tlačítka Kopírovat a Stáhnout
• Víc obrázků naráz? "Stáhnout vše" je uloží jedním klikem a "Otevřít na kartě" ti dá víc místa na velké dávky
• Klikni na oříznutý obrázek a uvidíš ho na celou šířku
• Výsledek je vždy bezeztrátové PNG s původním názvem: "logo.png" zůstane "logo.png", z "foto.webp" bude "foto.png"

PŘÍMO ZE STRÁNKY
• Klikni pravým na jakýkoli obrázek a zvol "Oříznout a zkopírovat obrázek" nebo "Oříznout a uložit obrázek"
• Klikni pravým na odkaz ke stažení a zvol "Oříznout a stáhnout obrázek z odkazu": dostaneš obrázek v plné velikosti, ne jen malý náhled nebo náhled s vodoznakem
• Krátká poznámka dole na stránce řekne, co se stalo

STAŽENÉ OBRÁZKY ROVNOU OŘÍZNUTÉ
• Zapni "Ořezávat stažené obrázky" (ve výchozím stavu je vypnuté) a každé PNG, WebP, AVIF nebo GIF, které z webu stáhneš, se nahradí oříznutou kopií se stejným názvem
• Reaguje až na dokončené stažení, takže funguje i po odpočtu nebo captche (tu ale vyplníš sám)
• JPEGy, animované obrázky a obrázky, na kterých není co ořezat, zůstanou, jak jsou. Stejně tak stažený soubor, který web podruhé nevydá

ČISTÉ OKRAJE
• Nechat: řízne hned za posledním pixelem, který není úplně průhledný, pro přesnou hranu
• Oříznout opar: pixely pod 2 % krytí se nepočítají, takže téměř neviditelné zbytky po odstranění pozadí ořez nenatáhnou. Nejsou vidět, takže se neusekne nic, co je vidět
• Oříznout víc: odřízne i jemné stíny a záři (pod 10 % krytí). Zkontroluj výsledek, může zmizet i měkký okraj samotného objektu
• Falešná průhlednost: když má obrázek z fotobanky nebo z AI šedobílou šachovnici namalovanou přímo v sobě, odříznou se i řádky a sloupce, ve kterých není nic než ten vzor

PŘIDEJ STÍN (VOLITELNĚ)
• Nahoře v popupu přepni na "Přidat stín", přidej obrázek a uvidíš ho ve velkém, i se stínem
• Pět vzhledů na začátek: Měkký, Výrazný, Plovoucí, Shora a Ze strany
• Pokročilé nastavení: typ (na podložce, plovoucí nebo klasický), odkud svítí světlo, barva (šest na výběr nebo jakýkoli hex kód), intenzita, měkkost a vzdálenost. Náhledy se mění s každým posuvníkem
• Vyzkoušej ho na bílém, šedém, černém nebo průhledném pozadí (jen na pohled, soubor zůstává průhledný)
• Oblíbené vzhledy si ulož do "Moje stíny"
• "Stáhnout se stínem" ti dá obrázek se stínem na průhledném pozadí, oříznutý tam, kde stín končí
• Žádná AI: stín vzniká z obrysu samotného obrázku, v tvém počítači

PODPOROVANÉ FORMÁTY
PNG, WebP, AVIF a GIF (první snímek). SVG podporované není a JPEG nemá průhlednost, kterou by šlo ořezat.

ROZHRANÍ V 8 JAZYCÍCH
Čeština, slovenština, angličtina, němčina, francouzština, španělština, vietnamština a čínština (zjednodušená). Řídí se prohlížečem, nebo si jazyk vybereš dole v popupu. Tmavý nebo světlý vzhled, případně podle prohlížeče.

SOUKROMÍ
Každý obrázek se ořezává v tvém počítači a nikam se nenahrává. Žádná analytika, žádné reklamy, žádné účty a Edge Trim si pamatuje jen tvoje nastavení, v tvém prohlížeči. Ven odejde jen zpráva, kterou se rozhodneš poslat: přes "Problém nebo nápad?" v popupu, nebo na krátké stránce, která se otevře, když rozšíření odebereš. Podrobnosti v zásadách ochrany soukromí.

OPRÁVNĚNÍ
• "Číst a měnit veškerá vaše data na všech webech": když klikneš pravým na obrázek nebo odkaz ke stažení a zvolíš možnost Edge Trim, rozšíření načte ten jeden obrázek z adresy, na kterou stránka odkazuje, a ukáže na stránce krátkou poznámku. Se zapnutým "Ořezávat stažené obrázky" načte obrázek, který jsi právě stáhl, ještě jednou ze stejné adresy. Jinak na stránce nedělá nic.
• "Správa stahování": aby mohl uložit oříznutý obrázek do složky Stažené soubory a se zapnutým "Ořezávat stažené obrázky" nahradit stažený soubor jeho oříznutou kopií.

OPEN SOURCE
Celé rozšíření je open source (GPL-3.0), takže si kdokoli může ověřit, co přesně dělá: github.com/Cleedek/edge-trim. Čistý JavaScript, bez sestavování a bez závislostí.

PROBLÉM NEBO NÁPAD?
Něco nefunguje, nebo ti něco chybí? "Problém nebo nápad?" dole v popupu mi pošle zprávu. Čtu každou.

PODPOŘ AUTORA
Edge Trim je zdarma a bez reklam. Pokud ti ušetří piplání s ořezy, v popupu najdeš stránku "Podpořit autora" s QR platbou, Revolutem, PayPalem, Solanou a Sui. Úplně dobrovolně, a děkuju!

S 💜 ve Vietnamu vytváří Cleedek.
```

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Screenshot 1: popup, before and after | 1280×800 | ✅ Re-rendered 2026-11-08 with the Trim / Add shadow switch | `store/images/en/screenshot-1.png` |
| Screenshot 2: right-click menu on a shop's picture | 1280×800 | ✅ In the store since 1.0.0 | `store/images/en/screenshot-2.png` |
| Screenshot 3: the drop shadow | 1280×800 | ✅ Re-rendered 2026-11-08: the old "Add shadow" toggle is gone from the Shadow section | `store/images/en/screenshot-3.png` |
| Screenshot 4: trimming downloads | 1280×800 | ✅ In the store since 1.0.0 | `store/images/en/screenshot-4.png` |
| Screenshot 5: invisible leftovers, and the promises | 1280×800 | ✅ In the store since 1.0.0 | `store/images/en/screenshot-5.png` |
| Small Promo Tile | 440×280 | ✅ Chosen (concept 2, "Snaps to the edge.") | `store/images/en/promo-tile.png` |
| Marquee Promo Tile | 1400×560 | ✅ Chosen (concept 2, "Snaps to the edge.") | `store/images/en/promo-marquee.png` |
| Promo video (YouTube link) | 1920×1080, 33.5 s | ✅ In the store since 1.0.0; shots 8 and 9 still show the old "Add shadow" toggle | `store/video/out/edge-trim-promo-en-1080p.mp4` |

All of them are drawn from `store/src` (`shots.html`, `promo.html`) with `node store/render.mjs [lang]`. The sushi platter is the cut-out photo from Filip's demo (`store/src/photos/sushi-platter.webp`); only the made-up logo is drawn in code, and the nearly invisible leftovers in screenshot 5 are added to the photo there (`store/src/samples.js`). The Czech versions have the same file names in `store/images/cs`, and the Czech video is `store/video/out/edge-trim-promo-cs-1080p.mp4`.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `contextMenus` | permissions | Adds "Trim and copy image" and "Trim and save image" to the right-click menu on pictures, and "Trim and download linked image" on links, the extension's main way to trim a picture from a web page. |
| `downloads` | permissions | Saves the trimmed picture to the user's Downloads folder when they click Download or "Download all" in the popup, or choose "Trim and save image". Also used when a page blocks copying, so the result is saved instead of lost. With the optional "Trim downloaded pictures" setting turned on (off by default), it notices when a picture download finishes and replaces that file with its trimmed copy under the same name; JPEGs, animated pictures and pictures with nothing to trim are left alone. |
| `scripting` | permissions | After the user chooses an Edge Trim menu item on a picture, or a picture download finishes while "Trim downloaded pictures" is on, runs a small one-off script in that page to: copy the trimmed picture to the clipboard, load the picture with the page's own access when the server refuses a direct load (pictures behind a login), and show a short on-page note saying what happened. Nothing runs on a page otherwise. |
| `storage` | permissions | Remembers the settings on this device: how to treat nearly invisible pixels, whether to trim downloaded pictures, the interface language, the shadow look and preview background last used, and the shadow looks the user saved. |
| `<all_urls>` | host_permissions | Pictures on a page are very often served from a different site than the page itself (image hosts, CDNs). To trim the picture (or download link) the user right-clicked, or a picture they just downloaded with "Trim downloaded pictures" on, the extension must load it again from wherever it is hosted, which can be any site. The picture is processed locally; nothing is sent anywhere else. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes, since 1.0.1. Pictures still never leave the device, but two things can now reach the developer, both only when the user chooses to send them: the "Write to me" form in the popup (opened with "Problem or idea?") and the optional "Sorry to see you go" page Chrome opens after removal (feedback.cleedek.com/bye). Google counts a voluntary contact form as collecting user data, and also wants data handled only on the device disclosed ("Extensions are required to disclose how they handle user data, even when data is processed or stored locally", User Data FAQ, developer.chrome.com/docs/webstore/program-policies/user-data-faq). So tick **Website content**, **Personally identifiable information** and **Personal communications**, and nothing else.

The category names below are the ones the form used on 2026-11-04. If the form now words them differently, pick the closest match and keep the same three.

| Data Type | Tick it? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | **Yes** (new in 1.0.1) | Yes, only if the user types it | The email address a user may add to a message or to the answer after removal, so the developer can reply. Optional; most messages come without one. | No |
| Health info | No | No | | No |
| Financial info | No | No | | No |
| Authentication info | No | No | | No |
| Personal communications | **Yes** (new in 1.0.1) | Yes, only when the user presses Send | The text of a message the user writes in "Write to me" or on the page after removal. It is emailed to the developer to answer it and fix problems, and is not stored by the service. | No |
| Location | No | No | | No |
| Web history | No | No | Not kept: with "Trim downloaded pictures" on, the address of the tab a download came from is read once to show the note there. A judgment call; tick it if a reviewer asks. | No |
| User activity | No | No | No clicks, keystrokes or browsing are recorded; it only reacts to a finished download while that setting is on. | No |
| Website content | **Yes** | No | The right-clicked picture, or a picture the user just downloaded, is loaded and trimmed in the browser only; it is never sent to the developer or anyone else. | No |

Notes for the disclosure form:
- Settings use local browser storage only (not synced), so nothing goes to Google's servers.
- The only network requests that load pictures fetch the picture the user right-clicked, or (with "Trim downloaded pictures" on) the picture they just downloaded, from the site that already hosts it.
- "Write to me" sends, only on Send: the message, the email address if entered, and (unless "Include technical details" is switched off) the extension version, browser, operating system and interface language. They go to feedback.cleedek.com, the developer's own Cloudflare Worker (code: ~/extension-feedback), which emails them to the developer and does not store or log them. The form says so above the Send button: "I get your message by email, only to reply and fix problems. Nothing is sent until you press Send."
- After removal, Chrome opens feedback.cleedek.com/bye?ext=edge-trim&v=<version>&lang=<language>. The address holds nothing personal. Only if the user picks a reason and presses Send are the reason, their text (for one reason, which picture or site failed) and an optional email sent the same way.
- The "Support the creator" screen only shows payment links and QR codes. Opening one is the user's choice and goes to that payment service; the extension sends nothing.

### Remote Code
**Are you using remote code?** No, I am not using remote code. Every script is in the package; the links in the popup (GitHub, the payment pages, cleedek.com) only open a web page, and the feedback form only sends a message to feedback.cleedek.com and reads back "sent" or "failed", never code.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
https://cleedek.com/edge-trim/privacy

Live since 2026-11-04. The text below is the 1.0.1 version (dated November 8, 2026), which mentions the feedback form and the page after removal; it goes live when the portfolio change is pushed, and that has to happen before 1.0.1 is submitted. The page is `src/pages/[...lang]/edge-trim/privacy.astro` in the cleedek-portfolio repo; the text below is the same, so change both together. A `<all_urls>` permission makes the policy required, and a dead link is an automatic rejection.

```
Privacy Policy (Edge Trim, browser extension)

Last updated: November 8, 2026

SUMMARY
Edge Trim collects nothing on its own and never sells or shares personal data. Every picture is trimmed, and every shadow drawn, inside your browser on your computer; no picture is ever uploaded to the developer or to any other service. The only thing that reaches the author is what you decide to send: a message through "Write to me" in the popup, or an answer on the page that opens after you remove the extension. It arrives by email.

WHAT STAYS IN YOUR BROWSER
- Your settings, saved in the browser on this device and not synced: how to treat nearly invisible pixels, whether to trim downloaded pictures, the interface language, the appearance (dark, light or the same as the browser), the shadow look and preview background you used last, and the shadow looks you saved under "My shadows". Removing the extension deletes them.
- The pictures you drop, choose or paste into the popup, and their trimmed copies, only while the popup (or its tab) is open. They are gone when you close it.
- A message you start in "Write to me", so it isn't lost if the popup closes, until you send it; and, after an update, which version you had before, so the "What's new" card shows only once. Removing the extension deletes both.

NETWORK REQUESTS THE EXTENSION MAKES
- When you right-click a picture or a download link and choose an Edge Trim option, the extension loads that one picture from the address the page points to, the same way the page itself does, including your sign-in on that site, so pictures behind a login work too. If the site refuses, the page you are on loads it instead.
- Only if you turn on "Trim downloaded pictures" (off by default): when a PNG, WebP, AVIF or GIF download finishes, the extension loads that picture once more from the same address, to trim it. To show its note on the right page, it looks up which open tab the download came from; that address is used only for this and is not kept.
- Only if you open "Write to me" (the "Problem or idea?" button at the bottom of the popup) and press Send: your message, the email address if you entered one, and, unless you switch off "Include technical details", the extension version, browser, system and interface language go to feedback.cleedek.com, a small service the author runs on Cloudflare, which emails them to the author. The service does not store or log the message, and your email address is used only to reply. If sending fails, the popup offers to send the same text from your own email app instead.
- When you remove the extension, Chrome opens a short "Sorry to see you go" page at feedback.cleedek.com/bye. Its address carries only the extension's name, its version and your interface language, so the page opens in your language. Answering is optional: only if you pick a reason and press Send do the reason, anything you write (for one of the reasons, which picture or website didn't work) and the email address if you entered one go to the author by email, the same way. The service does not store or log them.
Like any website, feedback.cleedek.com receives your IP address when the page opens or you send something; the service uses it only to limit how many messages one address can send per minute and does not store it.
No other requests are made. There are no analytics, no ads, no accounts and no tracking.

LINKS IN THE POPUP
The optional "Support the creator" screen shows payment links and QR codes, and the popup links to the source code on GitHub and to cleedek.com. They only open if you click them, and then that site's own privacy policy applies. The extension sends nothing to them.

CHANGES
If this policy changes, the new version will be posted at this address with a new date.

CONTACT
Questions: cleedek@gmail.com
```

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name**: Cleedek
**Contact Email**: cleedek@gmail.com (shown publicly on the listing, must be monitored; the same address is on the privacy policy)
**Support URL**: https://github.com/Cleedek/edge-trim/issues
**Homepage URL**: https://github.com/Cleedek/edge-trim (in the store since 1.0.0). Optional: https://cleedek.com/work/edge-trim now describes the extension too, with the trailer and changelog; switching to it is a free choice, not needed for 1.0.1.
**Official URL**: leave empty (needs the site verified in Google Search Console)
**Mature content**: off

## Test Instructions (optional tab)

No account or sign-in is needed, so the tab can stay empty. If you want to help the reviewer, paste:

```
No account or sign-in is needed.
1. Click the toolbar icon and drop a transparent PNG (or paste one with Cmd/Ctrl+V): the empty space around it is cut away. Copy and Download sit next to each result.
2. On any web page, right-click a transparent picture and choose Edge Trim > "Trim and copy image" or "Trim and save image". A short note at the bottom of the page says what happened.
3. Optional: turn on "Trim downloaded pictures" in the popup, then download a transparent PNG from any site; it is replaced by its trimmed copy with the same name.
4. Optional: at the top of the popup, switch to "Add shadow", add a picture and pick a look.
Pictures are processed locally and never sent anywhere. The only data that leaves the browser is a message the user writes and sends through "Problem or idea?" at the bottom of the popup (it goes to feedback.cleedek.com, the developer's own service, which emails it to the developer).
```

## Packaging

The upload ZIP should contain only what the extension needs. From the project folder:

```bash
V=$(node -p "require('./manifest.json').version") && mkdir -p dist && rm -f "dist/edge-trim-$V.zip" && zip -r "dist/edge-trim-$V.zip" manifest.json background.js popup.html popup.css popup.js theme.js lib _locales icons LICENSE -x "*.DS_Store" "icons/icon.svg" "icons/icon-small.svg"
```

`icons/support/*.svg` stays in (the support screen uses it). `LICENSE` is in since 1.0.1: GPL-3.0 asks for a copy of the licence with every copy of the program, and Subtitle Overlay's package has it too. The file name carries the version from `manifest.json` (`edge-trim-1.0.1.zip`), so an old and a new package can't be mixed up. `dist/` is already in `.gitignore`. Before zipping, check `git status`: everything in these files should be committed (or meant for this release), so no unfinished work from elsewhere slips into the package.

Then everything to upload, in one folder sorted by language (`dist/chrome-web-store`):

```bash
V=$(node -p "require('./manifest.json').version") && O=dist/chrome-web-store && rm -rf "$O" && mkdir -p "$O/1-globalni-en" "$O/2-cestina-cs" && cp "dist/edge-trim-$V.zip" "$O/" && cp icons/icon128.png "$O/1-globalni-en/store-icon-128.png" && for n in 1 2 3 4 5; do cp store/images/en/screenshot-$n.png "$O/1-globalni-en/"; cp store/images/cs/screenshot-$n.png "$O/2-cestina-cs/"; done && cp store/images/en/promo-tile.png "$O/1-globalni-en/small-promo-tile-440x280.png" && cp store/images/en/promo-marquee.png "$O/1-globalni-en/marquee-promo-tile-1400x560.png" && cp store/video/out/edge-trim-promo-en-1080p.mp4 "$O/1-globalni-en/video-pro-youtube-en.mp4" && cp store/video/out/edge-trim-promo-cs-1080p.mp4 "$O/2-cestina-cs/video-pro-youtube-cs.mp4"
```

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.1 | 2026-11-08 | Trim / Add shadow switch at the top of the popup (looks shown on a shaded ball until there's a picture), "Problem or idea?" feedback form, What's new card (no entry yet, so it stays hidden), "Sorry to see you go" page after removal. | Draft complete 2026-11-09, waiting for Submit for review |
| 1.0.0 | 2026-11-02 | First version. The store build of 2026-11-04 also had the shadow, "My shadows", trimming downloads and the right-click option for download links. | Published 2026-11-05 |

## Review Notes

### Known Issues / Limitations
- SVG isn't supported; animated GIF/WebP keep only the first frame.
- JPEG has no transparency, so there's nothing to trim.
- Colour profiles and metadata are dropped when the PNG is re-encoded.
- Shadows are drawn from the outline only, so for objects photographed from above at an angle the contact with the ground is approximate.
- Copy from the right-click menu needs a secure (https) page; elsewhere the picture is saved instead.
- On pages extensions can't touch (browser settings pages, the Web Store, the PDF viewer), the result note shows on the toolbar icon instead of the page.
- "Trim downloaded pictures" loads the picture a second time and only replaces the download when that copy has the same size in bytes. Links that work only once, and pictures a page hands over as a blob and discards right away, stay untrimmed (the original is kept). The trimmed copy always goes to the Downloads folder.
- `<all_urls>` brings a more thorough review. A narrower alternative (asking for site access only when needed) was considered but not tested.
- The support screen lists crypto wallet addresses (Solana, Sui). Not known whether reviewers question this; if they do, those two tabs can be removed.

### Rejection History
None yet.
