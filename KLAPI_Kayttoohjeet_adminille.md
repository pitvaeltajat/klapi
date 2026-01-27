# KLAPI Käyttöohjeet: Admin

## Yleistä

Admin-käyttäjällä on laajennetut oikeudet hallita kalustoa, käyttäjiä, varauksia ja järjestelmän asetuksia. Admin-paneeli löytyy osoitteesta `/admin`.

---

## 1. Kaluston hallinta

### 1.1. Uuden tavaran lisääminen

- Siirry sivulle **Admin → Luo uusi kama** (`/admin/createItem`)
- Täytä lomakkeeseen tavaran nimi, kuvaus, määrä, kategoriat ja sijainti
- Voit lisätä kuvan tavaralle
- Tallenna painamalla **Luo kama** tai **Luo ja lisää toinen** (jos haluat lisätä useita peräkkäin)

### 1.2. Tavaran muokkaaminen

- Siirry tavaran sivulle ja paina **Muokkaa** (näkyy vain adminille)
- Muokkaa tarvittavat tiedot ja tallenna

### 1.3. Tavaran poistaminen

- Siirry tavaran sivulle ja paina **Poista**
- Vahvista poisto modalissa

---

## 2. Varausten hallinta

### 2.1. Kaikkien varausten tarkastelu

- Siirry **Varaukset**-sivulle (`/loan`)
- Näet kaikki varaukset, niiden tilat ja raportit

### 2.2. Varauksen hyväksyminen ja aloittaminen

- Voit hyväksyä varauksen (muuttaa tilan "ACCEPTED" → "INUSE")
- Voit aloittaa varauksen puolesta (esim. jos käyttäjä ei itse pysty)

### 2.3. Varauksen muokkaaminen

- Siirry varauksen muokkaussivulle (`/admin/editLoan/[id]`)
- Voit muuttaa kuvausta, päivämääriä, lisätä/poistaa tavaroita
- Muutokset tallennetaan painamalla **Tallenna**

### 2.4. Varauksen palauttaminen

- Voit merkitä varauksen palautetuksi
- Voit tarkastella ja käsitellä raportteja (esim. puutteet, vauriot)

---

## 3. Käyttäjien hallinta

### 3.1. Käyttäjien listaaminen

- Näet kaikki käyttäjät admin-paneelissa
- Näet käyttäjän nimen, sähköpostin ja roolin

### 3.2. Roolin vaihtaminen

- Voit vaihtaa käyttäjän roolin (ADMIN ↔ USER)
- Kiosk-käyttäjän roolia ei voi muuttaa

### 3.3. Käyttäjän poistaminen

- Voit poistaa käyttäjän painamalla **Poista**
- Poisto vaatii vahvistuksen

### 3.4. Kiosk-salasanan luominen

- Voit luoda uuden kiosk-salasanan admin-paneelista
- Salasana näytetään modaalissa

### 3.5. Admin PIN-koodin asettaminen

- Voit asettaa admin PIN-koodin, jota käytetään admin-oikeuksien nostoon kioskissa

---

## 4. Kaluston organisointi

### 4.1. Kategoriat ja sijainnit

- Voit lisätä, muokata ja poistaa kategorioita ja sijainteja
- Kategoriat ja sijainnit näkyvät vain adminille

### 4.2. Laatikot

- Näet kaikki laatikot ja niiden sisällön (`/admin/boxes`)
- Näet boksissa olevat varaukset ja niiden tilat
- Voit tarkastella raportteja bokseista

---

## 4.3. Kiosk elevate (admin-oikeudet kioskissa)

- Kiosk-käyttäjä voi nostaa itselleen admin-oikeudet syöttämällä PIN-koodin (asetetaan admin-paneelissa)
- PIN-koodin syöttö avaa admin-oikeudet kioskissa määräajaksi (30 min)
- Oikeudet vanhenevat automaattisesti, jonka jälkeen rooli palautuu kioskiksi
- PIN-koodin voi asettaa admin-paneelissa kohdasta "Aseta admin pin-koodi"
- Kiosk-käyttäjän salasana voidaan luoda admin-paneelista (näkyy modaalissa, voimassa rajoitetun ajan)

---

## 5. Raportit

- Näet kaikki raportit (`/admin/reports`)
- Raportit liittyvät puutteisiin, vaurioihin ja muihin ongelmiin (esim. tavara rikki, puuttuu, väärä määrä)
- Raportti voi liittyä lainaan, varaukseen tai yksittäiseen tavaraan
- Raportin tiedoista näet mm. sisällön, kohteet, liittyvän lainan ja raportin tilan (käsittelemättä, käsittelyssä, ratkaistu)
- Voit merkitä raportin käsitellyksi (esim. "Ratkaistu"/"RESOLVED")
- Raportit auttavat seuraamaan kaluston kuntoa ja puutteita

---

## 6. Sähköposti-ilmoitukset

- Admin voi ottaa käyttöön viikottaisen muistutuksen bokseissa olevista varauksista
- Admin saa ilmoituksen uusista varauksista, jos ilmoitukset ovat päällä

---

## 7. API-toiminnot

---

## 7. Ilmoitukset (Announcements)

- Ilmoitukset näkyvät sivulla `/item/announcements`
- Ilmoitukset liittyvät tiettyyn tavaraan ja näkyvät käyttäjille sekä adminille
- Admin voi poistaa ilmoituksen ennen sen vanhentumista ("Poista ilmoitus")
- Ilmoituksella voi olla vanhenemisaika, jonka jälkeen se ei enää näy oletuksena
- Admin voi tarkastella myös vanhentuneita ilmoituksia ("Näytä vanhentuneet ilmoitukset")
- Ilmoitukset ovat hyödyllisiä esimerkiksi huolto-, käyttö- tai varoitusviesteihin

- Kaikki admin-toiminnot (lisäys, muokkaus, poisto) on suojattu: vain admin voi käyttää näitä API-päätepisteitä
- Esim. `/api/item/editItem`, `/api/item/deleteItem`, `/api/user/getUsers`, `/api/loan/approveLoan` jne.

---

## 8. Oikeuksien hallinta

- Admin-oikeudet voidaan nostaa PIN-koodilla kioskissa
- Admin-oikeudet vanhenevat automaattisesti (esim. session adminExpiry)
- Oikeuksien vanhentuessa rooli palautuu kioskiksi

---

## 9. Käyttöliittymä

- Adminille näkyy lisävalinnat ylävalikossa: **Admin**, **Laatikot**, **Raportit**
- Admin näkee lisätietoja varauksista, tavaroista ja käyttäjistä
- Kaikki admin-toiminnot on suojattu: muut käyttäjät eivät näe eivätkä voi käyttää näitä

---

## 10. Vinkkejä ja huomioita

- Muista tarkistaa raportit ja palautukset säännöllisesti
- Käytä PIN-koodia admin-oikeuksien nostoon vain tarvittaessa
- Varmista, että tavaroiden tiedot ovat ajan tasalla
- Käyttäjien poistaminen on lopullista – varmista ennen vahvistusta

---

## 11. Tuki ja yhteydenotto

- Ongelmatilanteissa ota yhteyttä järjestelmän ylläpitäjään
- Sähköposti-ilmoitukset tulevat automaattisesti, älä vastaa niihin

---

**Päivitetty: 27.1.2026**

---
