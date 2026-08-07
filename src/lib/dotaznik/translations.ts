// Onboarding questionnaire (nástupní dotazník) — i18n dictionaries.
// Ported 1:1 from the standalone `registracni_formular` HTML page; keys and
// wording must stay in sync with what the HR backend expects to receive.

export const LANGS = ["cs", "pl", "en"] as const;
export type Lang = (typeof LANGS)[number];

export interface Translation {
  page_title: string;
  h1: string;
  intro: string;
  sec_personal: string;
  lbl_titul_pred: string;
  lbl_titul_za: string;
  lbl_jmeno: string;
  err_jmeno: string;
  lbl_prijmeni: string;
  err_prijmeni: string;
  lbl_rodne_prijmeni: string;
  opt_pokud_se_lisi: string;
  lbl_rodne_cislo: string;
  err_rodne_cislo: string;
  lbl_rodinny_stav: string;
  err_rodinny_stav: string;
  opt_vyberte: string;
  opt_svobodny: string;
  opt_zenaty: string;
  opt_rozvedeny: string;
  opt_vdovec: string;
  opt_partnerstvi: string;
  lbl_vzdelani: string;
  err_vzdelani: string;
  opt_zakladni: string;
  opt_vyucen: string;
  opt_stredni: string;
  opt_vyssi_odborne: string;
  opt_bakalarske: string;
  opt_magisterske: string;
  opt_doktorske: string;
  lbl_narodnost: string;
  err_narodnost: string;
  opt_nar_cz: string;
  opt_nar_sk: string;
  opt_nar_pl: string;
  opt_nar_ua: string;
  opt_nar_ph: string;
  opt_nar_jina: string;
  lbl_narodnost_jina: string;
  err_narodnost_jina: string;
  lbl_prvni_zamestnani: string;
  lbl_pojistovna_foto: string;
  err_pojistovna_foto: string;
  hint_pojistovna_nevyplnovat: string;
  sec_contact: string;
  lbl_telefon: string;
  err_telefon: string;
  lbl_email: string;
  err_email: string;
  lbl_email2: string;
  err_email2: string;
  hint_email2: string;
  msg_email_mismatch: string;
  sub_trvale_bydliste: string;
  sub_korespondencni: string;
  lbl_ulice: string;
  err_ulice: string;
  lbl_cislo_popisne: string;
  err_cislo_popisne: string;
  lbl_mesto: string;
  err_mesto: string;
  lbl_psc: string;
  err_psc: string;
  opt_adresa_korespondencni_hint: string;
  sec_documents: string;
  documents_hint: string;
  lbl_op_predni: string;
  err_op_predni: string;
  lbl_op_zadni: string;
  err_op_zadni: string;
  lbl_doklad_vzdelani: string;
  opt_doklad_vzdelani_hint: string;
  err_doklad_vzdelani: string;
  lbl_zapoctovy_list: string;
  opt_nepovinne: string;
  sec_deductions: string;
  lbl_srazky: string;
  opt_ano: string;
  opt_ne: string;
  err_choice: string;
  sec_financial: string;
  lbl_pojistovna: string;
  err_pojistovna: string;
  opt_jina: string;
  lbl_ucet: string;
  opt_ucet_hint: string;
  err_ucet: string;
  sec_first_day: string;
  lbl_obed: string;
  hint_obed: string;
  sec_equipment: string;
  lbl_tricko: string;
  err_tricko: string;
  lbl_obuv: string;
  err_obuv: string;
  sec_consents: string;
  gdpr_box: string;
  lbl_gdpr: string;
  lbl_pravdivost: string;
  publish_intro: string;
  publish_items: string[];
  lbl_souhlas_zverejneni: string;
  opt_souhlas_zverejneni_hint: string;
  btn_review: string;
  btn_back: string;
  btn_confirm_send: string;
  recap_title: string;
  recap_intro: string;
  recap_note: string;
  recap_empty: string;
  btn_submitting: string;
  success_title: string;
  success_text: string;
  footer_text: string;
  msg_invalid: string;
  msg_no_endpoint: string;
  msg_submit_error: string;
}

export const translations: Record<Lang, Translation> = {
  cs: {
    page_title: "Nástupní dotazník – FINIDR, s.r.o.",
    h1: "Nástupní dotazník",
    intro:
      "Vyplňte prosím dotazník před vaším nástupem do firmy FINIDR, s.r.o. Dotazník zabere přibližně 5 minut a kdykoliv se můžete vrátit.",
    sec_personal: "Osobní údaje",
    lbl_titul_pred: "Titul před jménem",
    lbl_titul_za: "Titul za jménem",
    lbl_jmeno: "Jméno",
    err_jmeno: "Zadejte prosím jméno.",
    lbl_prijmeni: "Příjmení",
    err_prijmeni: "Zadejte prosím příjmení.",
    lbl_rodne_prijmeni: "Rodné příjmení",
    opt_pokud_se_lisi: "(pokud se liší)",
    lbl_rodne_cislo: "Rodné číslo",
    err_rodne_cislo: "Zadejte rodné číslo ve formátu 000000/0000.",
    lbl_rodinny_stav: "Rodinný stav",
    err_rodinny_stav: "Vyberte prosím rodinný stav.",
    opt_vyberte: "Vyberte…",
    opt_svobodny: "Svobodný/á",
    opt_zenaty: "Ženatý/Vdaná",
    opt_rozvedeny: "Rozvedený/á",
    opt_vdovec: "Vdovec/Vdova",
    opt_partnerstvi: "Registrované partnerství",
    lbl_vzdelani: "Nejvyšší dosažené vzdělání",
    err_vzdelani: "Vyberte prosím dosažené vzdělání.",
    opt_zakladni: "Základní",
    opt_vyucen: "Vyučen/a (bez maturity)",
    opt_stredni: "Střední s maturitou",
    opt_vyssi_odborne: "Vyšší odborné (DiS.)",
    opt_bakalarske: "Vysokoškolské – bakalářské",
    opt_magisterske: "Vysokoškolské – magisterské/inženýrské",
    opt_doktorske: "Vysokoškolské – doktorské (Ph.D.)",
    lbl_narodnost: "Státní příslušnost",
    err_narodnost: "Vyberte prosím státní příslušnost.",
    opt_nar_cz: "Česká",
    opt_nar_sk: "Slovenská",
    opt_nar_pl: "Polská",
    opt_nar_ua: "Ukrajinská",
    opt_nar_ph: "Filipínská",
    opt_nar_jina: "Jiná",
    lbl_narodnost_jina: "Uveďte prosím státní příslušnost",
    err_narodnost_jina: "Uveďte prosím státní příslušnost.",
    lbl_prvni_zamestnani: "Je toto Vaše první zaměstnání v České republice?",
    lbl_pojistovna_foto: "Foto kartičky zdravotní pojišťovny",
    err_pojistovna_foto: "Nahrajte prosím foto kartičky zdravotní pojišťovny.",
    hint_pojistovna_nevyplnovat:
      "Údaje o zdravotní pojišťovně nevyplňujte – HR oddělení je doplní z Vašeho předchozího zaměstnání.",
    sec_contact: "Kontaktní údaje",
    lbl_telefon: "Telefonní číslo",
    err_telefon: "Zadejte prosím platné telefonní číslo.",
    lbl_email: "E-mail",
    err_email: "Zadejte prosím platný e-mail.",
    lbl_email2: "E-mail pro kontrolu",
    err_email2:
      "E-maily se neshodují. Zkontrolujte prosím, zda jste je zadali stejně.",
    hint_email2:
      "E-mail zadejte prosím dvakrát – slouží ke kontrole překlepů. Kopírování do druhého pole je záměrně vypnuté.",
    msg_email_mismatch:
      "Zadané e-maily se neshodují. Opravte je prosím před odesláním.",
    sub_trvale_bydliste: "Trvalé bydliště",
    sub_korespondencni: "Korespondenční adresa",
    lbl_ulice: "Ulice",
    err_ulice: "Zadejte prosím ulici.",
    lbl_cislo_popisne: "Číslo popisné / orientační",
    err_cislo_popisne: "Zadejte prosím číslo popisné.",
    lbl_mesto: "Město / obec",
    err_mesto: "Zadejte prosím město.",
    lbl_psc: "PSČ",
    err_psc: "Zadejte prosím PSČ.",
    opt_adresa_korespondencni_hint: "(pokud se liší od trvalého bydliště)",
    sec_documents: "Doklady (fotografie)",
    documents_hint:
      "Vyfoťte nebo naskenujte doklady čitelně, ideálně na rovné podložce. Přijímané formáty: JPG, PNG, PDF.",
    lbl_op_predni: "Občanský průkaz – přední strana",
    err_op_predni: "Nahrajte prosím přední stranu OP.",
    lbl_op_zadni: "Občanský průkaz – zadní strana",
    err_op_zadni: "Nahrajte prosím zadní stranu OP.",
    lbl_doklad_vzdelani: "Doklad o nejvyšším dosaženém vzdělání",
    opt_doklad_vzdelani_hint:
      "(maturitní vysvědčení, výuční list nebo diplom)",
    err_doklad_vzdelani: "Nahrajte prosím doklad o vzdělání.",
    lbl_zapoctovy_list: "Zápočtový list z předchozího zaměstnání",
    opt_nepovinne: "(nepovinné)",
    sec_deductions: "Srážky ze mzdy",
    lbl_srazky: "Máte nařízené srážky ze mzdy (exekuce, insolvence)?",
    opt_ano: "Ano",
    opt_ne: "Ne",
    err_choice: "Zvolte prosím jednu z možností.",
    sec_financial: "Finanční a pojistné údaje",
    lbl_pojistovna: "Zdravotní pojišťovna",
    err_pojistovna: "Vyberte prosím zdravotní pojišťovnu.",
    opt_jina: "Jiná",
    lbl_ucet: "Číslo bankovního účtu",
    opt_ucet_hint: "(vč. kódu banky)",
    err_ucet: "Zadejte prosím číslo účtu vč. kódu banky.",
    sec_first_day: "První pracovní den",
    lbl_obed: "Mám zájem o objednání obědu na první pracovní den",
    hint_obed: "Cena oběda je 48 Kč a bude sražena ze mzdy.",
    sec_equipment: "Pracovní vybavení",
    lbl_tricko: "Velikost trička",
    err_tricko: "Vyberte prosím velikost trička.",
    lbl_obuv: "Velikost pracovní obuvi",
    err_obuv: "Vyberte prosím velikost obuvi.",
    sec_consents: "Souhlasy",
    gdpr_box:
      "Vyplněním a odesláním tohoto formuláře poskytujete společnosti FINIDR, s.r.o. osobní údaje v rozsahu nezbytném pro pracovněprávní vztah (jméno, rodné číslo, státní příslušnost, kontaktní údaje, adresa, rodinný stav, zdravotní pojišťovna, bankovní spojení, dosažené vzdělání, fotografie občanského průkazu, dokladu o vzdělání, zápočtového listu a kartičky zdravotní pojišťovny, informace o nařízených srážkách ze mzdy). Údaje budou zpracovány v souladu s nařízením GDPR a použity výhradně pro účely personální a mzdové agendy. Podrobnosti o zpracování, době uchovávání a Vašich právech (přístup, oprava, výmaz) naleznete v [ODKAZ NA ZÁSADY OCHRANY OSOBNÍCH ÚDAJŮ].",
    lbl_gdpr:
      "Souhlasím se zpracováním osobních údajů dle výše uvedených informací (GDPR).",
    lbl_pravdivost:
      "Prohlašuji, že uvedené údaje jsou pravdivé a úplné, a beru na vědomí odpovědnost za jejich správnost.",
    publish_intro:
      "Na základě nařízení EU 2016/679 o ochraně osobních údajů (dále jen GDPR) Vás žádáme o poskytnutí souhlasu ke zpracování osobních údajů (zejména fotografií) za účelem zveřejnění:",
    publish_items: [
      "ve firemním časopise,",
      "na webových stránkách společnosti FINIDR,",
      "na sociálních sítích firmy FINIDR,",
      "na nástěnkách v prostorách firmy.",
    ],
    lbl_souhlas_zverejneni:
      "Souhlasím se zpracováním osobních údajů za účelem zveřejnění dle výše uvedených informací.",
    opt_souhlas_zverejneni_hint: "(nepovinné, souhlas lze kdykoliv odvolat)",
    btn_review: "Zkontrolovat údaje",
    btn_back: "Zpět a opravit",
    btn_confirm_send: "Vše souhlasí – odeslat",
    recap_title: "Kontrola údajů před odesláním",
    recap_intro:
      "Zkontrolujte prosím pečlivě všechny údaje. Podle nich připravíme Vaši pracovní smlouvu a další dokumenty – pozdější oprava znamená předělání všech dokumentů.",
    recap_note:
      "Zvláštní pozornost věnujte rodnému číslu, číslu bankovního účtu a e-mailu.",
    recap_empty: "nevyplněno",
    btn_submitting: "Odesílám…",
    success_title: "Děkujeme!",
    success_text:
      "Vaše údaje byly úspěšně odeslány na HR oddělení. Ozveme se Vám s dalšími informacemi před nástupem.",
    footer_text:
      "FINIDR, s.r.o. – máte-li s formulářem potíže, kontaktujte HR oddělení telefonicky nebo e-mailem.",
    msg_invalid: "Zkontrolujte prosím zvýrazněná pole.",
    msg_no_endpoint:
      "Formulář zatím není napojen na odesílací službu (ENDPOINT_URL). Kontaktujte prosím IT.",
    msg_submit_error:
      "Odeslání se nezdařilo. Zkuste to prosím znovu nebo kontaktujte HR.",
  },
  pl: {
    page_title: "Kwestionariusz wdrożeniowy – FINIDR, s.r.o.",
    h1: "Kwestionariusz wdrożeniowy",
    intro:
      "Prosimy o wypełnienie kwestionariusza przed rozpoczęciem pracy w firmie FINIDR, s.r.o. Wypełnienie zajmie około 5 minut, a do formularza można w każdej chwili wrócić.",
    sec_personal: "Dane osobowe",
    lbl_titul_pred: "Tytuł przed nazwiskiem",
    lbl_titul_za: "Tytuł po nazwisku",
    lbl_jmeno: "Imię",
    err_jmeno: "Proszę podać imię.",
    lbl_prijmeni: "Nazwisko",
    err_prijmeni: "Proszę podać nazwisko.",
    lbl_rodne_prijmeni: "Nazwisko rodowe",
    opt_pokud_se_lisi: "(jeśli inne)",
    lbl_rodne_cislo: "Numer rodny (rodné číslo)",
    err_rodne_cislo: "Proszę podać numer rodny w formacie 000000/0000.",
    lbl_rodinny_stav: "Stan cywilny",
    err_rodinny_stav: "Proszę wybrać stan cywilny.",
    opt_vyberte: "Wybierz…",
    opt_svobodny: "Kawaler / Panna",
    opt_zenaty: "Żonaty / Zamężna",
    opt_rozvedeny: "Rozwiedziony / Rozwiedziona",
    opt_vdovec: "Wdowiec / Wdowa",
    opt_partnerstvi: "Zarejestrowany związek partnerski",
    lbl_vzdelani: "Najwyższe wykształcenie",
    err_vzdelani: "Proszę wybrać poziom wykształcenia.",
    opt_zakladni: "Podstawowe",
    opt_vyucen: "Zawodowe (bez matury)",
    opt_stredni: "Średnie z maturą",
    opt_vyssi_odborne: "Wyższe zawodowe (DiS.)",
    opt_bakalarske: "Wyższe – licencjackie",
    opt_magisterske: "Wyższe – magisterskie / inżynierskie",
    opt_doktorske: "Wyższe – doktoranckie (Ph.D.)",
    lbl_narodnost: "Obywatelstwo",
    err_narodnost: "Proszę wybrać obywatelstwo.",
    opt_nar_cz: "Czeskie",
    opt_nar_sk: "Słowackie",
    opt_nar_pl: "Polskie",
    opt_nar_ua: "Ukraińskie",
    opt_nar_ph: "Filipińskie",
    opt_nar_jina: "Inne",
    lbl_narodnost_jina: "Proszę podać obywatelstwo",
    err_narodnost_jina: "Proszę podać obywatelstwo.",
    lbl_prvni_zamestnani:
      "Czy jest to Pana/Pani pierwsze zatrudnienie w Republice Czeskiej?",
    lbl_pojistovna_foto: "Zdjęcie karty ubezpieczenia zdrowotnego",
    err_pojistovna_foto:
      "Proszę załączyć zdjęcie karty ubezpieczenia zdrowotnego.",
    hint_pojistovna_nevyplnovat:
      "Prosimy nie wypełniać danych ubezpieczenia zdrowotnego – dział HR uzupełni je na podstawie poprzedniego zatrudnienia.",
    sec_contact: "Dane kontaktowe",
    lbl_telefon: "Numer telefonu",
    err_telefon: "Proszę podać prawidłowy numer telefonu.",
    lbl_email: "E-mail",
    err_email: "Proszę podać prawidłowy adres e-mail.",
    lbl_email2: "E-mail – potwierdzenie",
    err_email2:
      "Adresy e-mail nie są zgodne. Proszę sprawdzić, czy wpisano je identycznie.",
    hint_email2:
      "Prosimy wpisać e-mail dwukrotnie – służy to wykryciu literówek. Wklejanie do drugiego pola jest celowo wyłączone.",
    msg_email_mismatch:
      "Podane adresy e-mail nie są zgodne. Prosimy je poprawić przed wysłaniem.",
    sub_trvale_bydliste: "Adres zamieszkania",
    sub_korespondencni: "Adres korespondencyjny",
    lbl_ulice: "Ulica",
    err_ulice: "Proszę podać ulicę.",
    lbl_cislo_popisne: "Numer domu / mieszkania",
    err_cislo_popisne: "Proszę podać numer domu.",
    lbl_mesto: "Miasto / miejscowość",
    err_mesto: "Proszę podać miasto.",
    lbl_psc: "Kod pocztowy",
    err_psc: "Proszę podać kod pocztowy.",
    opt_adresa_korespondencni_hint: "(jeśli inny niż adres zamieszkania)",
    sec_documents: "Dokumenty (zdjęcia)",
    documents_hint:
      "Proszę zrobić czytelne zdjęcie lub skan dokumentów, najlepiej na płaskiej powierzchni. Akceptowane formaty: JPG, PNG, PDF.",
    lbl_op_predni: "Dowód osobisty – strona przednia",
    err_op_predni: "Proszę załączyć przednią stronę dowodu osobistego.",
    lbl_op_zadni: "Dowód osobisty – strona tylna",
    err_op_zadni: "Proszę załączyć tylną stronę dowodu osobistego.",
    lbl_doklad_vzdelani: "Dokument potwierdzający wykształcenie",
    opt_doklad_vzdelani_hint:
      "(świadectwo maturalne, świadectwo zawodowe lub dyplom)",
    err_doklad_vzdelani:
      "Proszę załączyć dokument potwierdzający wykształcenie.",
    lbl_zapoctovy_list: "Świadectwo pracy z poprzedniego zatrudnienia",
    opt_nepovinne: "(opcjonalnie)",
    sec_deductions: "Potrącenia z wynagrodzenia",
    lbl_srazky:
      "Czy posiada Pan/Pani nakazane potrącenia z wynagrodzenia (egzekucja komornicza, upadłość)?",
    opt_ano: "Tak",
    opt_ne: "Nie",
    err_choice: "Proszę wybrać jedną z opcji.",
    sec_financial: "Dane finansowe i ubezpieczeniowe",
    lbl_pojistovna: "Ubezpieczenie zdrowotne (kasa chorych)",
    err_pojistovna: "Proszę wybrać ubezpieczenie zdrowotne.",
    opt_jina: "Inna",
    lbl_ucet: "Numer konta bankowego",
    opt_ucet_hint: "(wraz z kodem banku)",
    err_ucet: "Proszę podać numer konta wraz z kodem banku.",
    sec_first_day: "Pierwszy dzień pracy",
    lbl_obed: "Chcę zamówić obiad na pierwszy dzień pracy",
    hint_obed: "Cena obiadu wynosi 48 CZK i zostanie potrącona z wynagrodzenia.",
    sec_equipment: "Wyposażenie robocze",
    lbl_tricko: "Rozmiar koszulki",
    err_tricko: "Proszę wybrać rozmiar koszulki.",
    lbl_obuv: "Rozmiar obuwia roboczego",
    err_obuv: "Proszę wybrać rozmiar obuwia.",
    sec_consents: "Zgody",
    gdpr_box:
      "Wypełniając i wysyłając ten formularz, przekazują Państwo firmie FINIDR, s.r.o. dane osobowe w zakresie niezbędnym do nawiązania stosunku pracy (imię i nazwisko, numer rodny, obywatelstwo, dane kontaktowe, adres, stan cywilny, ubezpieczenie zdrowotne, dane bankowe, wykształcenie, zdjęcia dowodu osobistego, dokumentu potwierdzającego wykształcenie, świadectwa pracy i karty ubezpieczenia zdrowotnego, informacje o nakazanych potrąceniach z wynagrodzenia). Dane będą przetwarzane zgodnie z RODO i wykorzystywane wyłącznie do celów kadrowo-płacowych. Szczegóły dotyczące przetwarzania, okresu przechowywania i Państwa praw (dostęp, poprawa, usunięcie) znajdą Państwo w [ODKAZ NA ZÁSADY OCHRANY OSOBNÍCH ÚDAJŮ].",
    lbl_gdpr:
      "Wyrażam zgodę na przetwarzanie danych osobowych zgodnie z powyższymi informacjami (RODO).",
    lbl_pravdivost:
      "Oświadczam, że podane dane są prawdziwe i kompletne, i przyjmuję do wiadomości odpowiedzialność za ich poprawność.",
    publish_intro:
      "Na podstawie Rozporządzenia UE 2016/679 o ochronie danych osobowych (RODO) prosimy o wyrażenie zgody na przetwarzanie danych osobowych (zwłaszcza zdjęć) w celu publikacji:",
    publish_items: [
      "w firmowym czasopiśmie,",
      "na stronie internetowej firmy FINIDR,",
      "w mediach społecznościowych firmy FINIDR,",
      "na tablicach ogłoszeń w siedzibie firmy.",
    ],
    lbl_souhlas_zverejneni:
      "Wyrażam zgodę na przetwarzanie danych osobowych w celu publikacji zgodnie z powyższymi informacjami.",
    opt_souhlas_zverejneni_hint:
      "(opcjonalne, zgodę można wycofać w każdej chwili)",
    btn_review: "Sprawdź dane",
    btn_back: "Wróć i popraw",
    btn_confirm_send: "Wszystko się zgadza – wyślij",
    recap_title: "Sprawdzenie danych przed wysłaniem",
    recap_intro:
      "Prosimy o dokładne sprawdzenie wszystkich danych. Na ich podstawie przygotujemy Państwa umowę o pracę i pozostałe dokumenty – późniejsza korekta oznacza konieczność przygotowania ich od nowa.",
    recap_note:
      "Szczególną uwagę prosimy zwrócić na numer rodny, numer konta bankowego i adres e-mail.",
    recap_empty: "nie wypełniono",
    btn_submitting: "Wysyłanie…",
    success_title: "Dziękujemy!",
    success_text:
      "Państwa dane zostały pomyślnie przesłane do działu HR. Skontaktujemy się z Państwem z dalszymi informacjami przed rozpoczęciem pracy.",
    footer_text:
      "FINIDR, s.r.o. – w razie problemów z formularzem prosimy o kontakt z działem HR telefonicznie lub mailowo.",
    msg_invalid: "Proszę sprawdzić zaznaczone pola.",
    msg_no_endpoint:
      "Formularz nie jest jeszcze podłączony do usługi wysyłkowej (ENDPOINT_URL). Proszę skontaktować się z IT.",
    msg_submit_error:
      "Wysyłanie nie powiodło się. Spróbuj ponownie lub skontaktuj się z działem HR.",
  },
  en: {
    page_title: "Onboarding Questionnaire – FINIDR, s.r.o.",
    h1: "Onboarding Questionnaire",
    intro:
      "Please fill in this questionnaire before your start date at FINIDR, s.r.o. It takes about 5 minutes and you can return to it at any time.",
    sec_personal: "Personal details",
    lbl_titul_pred: "Title before name",
    lbl_titul_za: "Title after name",
    lbl_jmeno: "First name",
    err_jmeno: "Please enter your first name.",
    lbl_prijmeni: "Last name",
    err_prijmeni: "Please enter your last name.",
    lbl_rodne_prijmeni: "Maiden name",
    opt_pokud_se_lisi: "(if different)",
    lbl_rodne_cislo: "Birth number (rodné číslo)",
    err_rodne_cislo: "Please enter the birth number in the format 000000/0000.",
    lbl_rodinny_stav: "Marital status",
    err_rodinny_stav: "Please select your marital status.",
    opt_vyberte: "Select…",
    opt_svobodny: "Single",
    opt_zenaty: "Married",
    opt_rozvedeny: "Divorced",
    opt_vdovec: "Widowed",
    opt_partnerstvi: "Registered partnership",
    lbl_vzdelani: "Highest education attained",
    err_vzdelani: "Please select your highest education.",
    opt_zakladni: "Primary education",
    opt_vyucen: "Vocational (no matriculation exam)",
    opt_stredni: "Secondary with matriculation exam (maturita)",
    opt_vyssi_odborne: "Higher vocational (DiS.)",
    opt_bakalarske: "University – Bachelor's degree",
    opt_magisterske: "University – Master's / Engineering degree",
    opt_doktorske: "University – Doctoral degree (Ph.D.)",
    lbl_narodnost: "Citizenship",
    err_narodnost: "Please select your citizenship.",
    opt_nar_cz: "Czech",
    opt_nar_sk: "Slovak",
    opt_nar_pl: "Polish",
    opt_nar_ua: "Ukrainian",
    opt_nar_ph: "Filipino",
    opt_nar_jina: "Other",
    lbl_narodnost_jina: "Please specify your citizenship",
    err_narodnost_jina: "Please specify your citizenship.",
    lbl_prvni_zamestnani: "Is this your first employment in the Czech Republic?",
    lbl_pojistovna_foto: "Photo of your health insurance card",
    err_pojistovna_foto: "Please upload a photo of your health insurance card.",
    hint_pojistovna_nevyplnovat:
      "Please do not fill in the health insurance details – the HR department will complete them from your previous employment.",
    sec_contact: "Contact details",
    lbl_telefon: "Phone number",
    err_telefon: "Please enter a valid phone number.",
    lbl_email: "Email",
    err_email: "Please enter a valid email address.",
    lbl_email2: "Confirm email",
    err_email2:
      "The email addresses do not match. Please check that you entered them identically.",
    hint_email2:
      "Please enter your email twice – this helps catch typos. Pasting into the second field is intentionally disabled.",
    msg_email_mismatch:
      "The email addresses you entered do not match. Please correct them before submitting.",
    sub_trvale_bydliste: "Permanent address",
    sub_korespondencni: "Mailing address",
    lbl_ulice: "Street",
    err_ulice: "Please enter the street.",
    lbl_cislo_popisne: "House / building number",
    err_cislo_popisne: "Please enter the house number.",
    lbl_mesto: "City / town",
    err_mesto: "Please enter the city.",
    lbl_psc: "Postal code",
    err_psc: "Please enter the postal code.",
    opt_adresa_korespondencni_hint: "(if different from permanent address)",
    sec_documents: "Documents (photos)",
    documents_hint:
      "Please take a clear photo or scan of each document, ideally on a flat surface. Accepted formats: JPG, PNG, PDF.",
    lbl_op_predni: "ID card – front side",
    err_op_predni: "Please upload the front side of your ID card.",
    lbl_op_zadni: "ID card – back side",
    err_op_zadni: "Please upload the back side of your ID card.",
    lbl_doklad_vzdelani: "Proof of highest education",
    opt_doklad_vzdelani_hint:
      "(matriculation certificate, vocational certificate or diploma)",
    err_doklad_vzdelani: "Please upload proof of your education.",
    lbl_zapoctovy_list: "Certificate of employment from previous job",
    opt_nepovinne: "(optional)",
    sec_deductions: "Wage deductions",
    lbl_srazky:
      "Do you have any court-ordered wage deductions (execution, insolvency)?",
    opt_ano: "Yes",
    opt_ne: "No",
    err_choice: "Please select one of the options.",
    sec_financial: "Financial and insurance details",
    lbl_pojistovna: "Health insurance provider",
    err_pojistovna: "Please select your health insurance provider.",
    opt_jina: "Other",
    lbl_ucet: "Bank account number",
    opt_ucet_hint: "(incl. bank code)",
    err_ucet: "Please enter your account number incl. bank code.",
    sec_first_day: "First working day",
    lbl_obed: "I would like to order lunch for my first working day",
    hint_obed: "Lunch costs CZK 48 and will be deducted from your salary.",
    sec_equipment: "Work equipment",
    lbl_tricko: "T-shirt size",
    err_tricko: "Please select a T-shirt size.",
    lbl_obuv: "Work shoe size",
    err_obuv: "Please select a shoe size.",
    sec_consents: "Consents",
    gdpr_box:
      "By completing and submitting this form, you provide FINIDR, s.r.o. with personal data necessary for the employment relationship (name, birth number, citizenship, contact details, address, marital status, health insurance provider, bank details, education, photos of your ID card, proof of education, certificate of employment and health insurance card, and information on any court-ordered wage deductions). The data will be processed in accordance with the GDPR and used solely for HR and payroll purposes. Details on processing, retention period, and your rights (access, correction, erasure) can be found at [ODKAZ NA ZÁSADY OCHRANY OSOBNÍCH ÚDAJŮ].",
    lbl_gdpr:
      "I agree to the processing of my personal data as described above (GDPR).",
    lbl_pravdivost:
      "I declare that the information provided is true and complete, and I acknowledge responsibility for its accuracy.",
    publish_intro:
      "Under EU Regulation 2016/679 on the protection of personal data (GDPR), we ask for your consent to the processing of personal data (in particular photographs) for the purpose of publication:",
    publish_items: [
      "in the company magazine,",
      "on the FINIDR company website,",
      "on FINIDR company social media,",
      "on notice boards on company premises.",
    ],
    lbl_souhlas_zverejneni:
      "I agree to the processing of my personal data for publication purposes as described above.",
    opt_souhlas_zverejneni_hint:
      "(optional, consent may be withdrawn at any time)",
    btn_review: "Review your details",
    btn_back: "Back and correct",
    btn_confirm_send: "Everything is correct – submit",
    recap_title: "Review your details before submitting",
    recap_intro:
      "Please check all details carefully. We will use them to prepare your employment contract and other documents – a later correction means all documents have to be redone.",
    recap_note:
      "Please pay particular attention to your birth number, bank account number and email address.",
    recap_empty: "not filled in",
    btn_submitting: "Submitting…",
    success_title: "Thank you!",
    success_text:
      "Your information has been successfully sent to the HR department. We will contact you with further details before your start date.",
    footer_text:
      "FINIDR, s.r.o. – if you have any trouble with this form, please contact the HR department by phone or email.",
    msg_invalid: "Please check the highlighted fields.",
    msg_no_endpoint:
      "This form is not yet connected to a submission service (ENDPOINT_URL). Please contact IT.",
    msg_submit_error: "Submission failed. Please try again or contact HR.",
  },
};
