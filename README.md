# 🍺 Beerpong Liga – Web-App

Eine Beerpong-Turnierverwaltung mit Echtzeit-Synchronisation über Firebase.

---

## Einrichtung (einmalig, ca. 15 Minuten)

### Schritt 1: Firebase-Projekt erstellen

1. Gehe zu [firebase.google.com](https://firebase.google.com) und melde dich mit einem Google-Konto an
2. Klicke auf **"Projekt erstellen"**
3. Gib einen Namen ein, z.B. `beerpong-liga`, und folge den Schritten
4. Im Projekt: linke Seitenleiste → **Firestore Database** → **"Datenbank erstellen"**
   - Modus: **Testmodus** wählen (für den Anfang ausreichend)
   - Standort: **eur3 (europe-west)** wählen → Fertigstellen
5. Linke Seitenleiste → Zahnrad ⚙️ → **Projekteinstellungen**
6. Runterscrollen zu **"Deine Apps"** → Web-Icon (`</>`) klicken → App registrieren
7. Du bekommst einen `firebaseConfig`-Block. Diesen im nächsten Schritt eintragen.

---

### Schritt 2: Firebase-Zugangsdaten eintragen

Öffne die Datei `js/firebase-config.js` und ersetze die Platzhalter mit deinen echten Werten:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "beerpong-liga.firebaseapp.com",
  projectId:         "beerpong-liga",
  storageBucket:     "beerpong-liga.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

### Schritt 3: Auf GitHub hochladen und deployen

#### 3a) Repository auf GitHub erstellen
1. Gehe zu [github.com](https://github.com) und erstelle ein neues **öffentliches** Repository (z.B. `beerpong-liga`)
2. Lade alle Dateien dieses Projekts in das Repository hoch (oder nutze Git):

```bash
git init
git add .
git commit -m "Beerpong Liga App"
git remote add origin https://github.com/DEIN-NAME/beerpong-liga.git
git push -u origin main
```

#### 3b) Netlify (empfohlen – kostenlos, einfachste Option)
1. Gehe zu [netlify.com](https://netlify.com) und logge dich mit GitHub ein
2. Klicke **"Add new site"** → **"Import an existing project"** → GitHub auswählen
3. Dein Repository auswählen → Deploy klicken
4. Fertig! Du bekommst eine URL wie `https://beerpong-liga.netlify.app`

#### Alternativ: GitHub Pages
1. Im Repository: **Settings** → **Pages**
2. Source: **Deploy from a branch** → Branch: `main`, Ordner: `/ (root)`
3. Speichern → Die URL erscheint nach kurzer Zeit

---

## Benutzung

| Benutzer | Standard-Passwort | Zugriff |
|----------|-------------------|---------|
| `admin`  | `morgakunz7`      | Alle Funktionen |
| `Spieler`| (vom Admin festgelegt) | Spielplan & Spielübersicht |

### Admin-Bereich
- **Einstellungen**: Spieler-Passwort, Startdatum & Uhrzeit setzen
- **Tagespriorisierung**: Wochentage per Drag & Drop priorisieren
- **Teams & Spieler**: Teamnamen und 8 Spieler pro Team eintragen
- **Doppelaufstellung**: D1–D4 pro Team festlegen

### Spielplan
- Ab Tag 3 nach dem Startdatum stehen 12 Spieltage zur Auswahl
- Spieltage nach Priorität sortiert anklicken (max. 12 auswählen)
- Jedem Spiel (E1–E8, D1–D4) einen Spieltag zuweisen

### Synchronisation
Alle Änderungen werden in Echtzeit über Firebase synchronisiert –
Admin und Spieler sehen immer denselben aktuellen Stand.

---

## Projektstruktur

```
beerpong-liga/
├── index.html              # Einstiegspunkt
├── css/
│   └── style.css           # Stylesheet
├── js/
│   ├── firebase-config.js  # ← Hier deine Firebase-Daten eintragen
│   └── app.js              # App-Logik
└── README.md
```
