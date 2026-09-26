# Dr. Durgesh Salunkhe · Research Portfolio & Academic Website

This repository contains the official academic website and research dissemination platform of **Dr. Durgesh Salunkhe**, Permanent Researcher at **CNRS** (Centre National de la Recherche Scientifique), formerly Postdoctoral Researcher at **EPFL LASA**, and Ph.D. graduate from **LS2N**, Nantes Université.

---

## 🏛️ Research Focus

* **Kinematic Intelligence:** Embedding analytical singularities, joint limits, and topology directly into robot learning dynamical systems to achieve zero-shot cross-robot skill transfer (*Science Robotics 2026*).
* **Geometry & Certified Motion Planning:** Classifying cuspidal behaviors, non-singular posture changes, and feasibility in commercial cobots (Franka, KUKA, FANUC, JACO) (*IEEE RA-L 2025*, *IJRR 2024*, *ICRA 2023*).
* **Mechanically Intelligent Design:** Novel mechanisms embodying physical intelligence, including spherical X-joints with pure rolling kinematics and surgical parallel manipulators (*CK 2025*, *MMT 2022*).

---

## 🚀 Running the Website Locally

You can run the website with Python's built-in static server or the included Flask server:

```bash
# Option 1: Native Python HTTP Server
python3 -m http.server 8000

# Option 2: Full Flask Server (with clean routes and CNRS portal)
./start_server.sh
```

Then open your browser to [http://localhost:8000](http://localhost:8000) (or `http://localhost:8080` for Flask).

---

## 📁 Repository Structure

```text
personal_website/
├── index.html              # Main homepage: Research pillars, highlights, interactive lab
├── projects.html           # Research projects & consortia (EuRobin, DARKO, ECARP, FAME)
├── publications.html       # Statically rendered, searchable publications library (20 papers)
├── personal.html           # Personal perspectives, philosophy, chess, and languages
├── server.py               # Clean routing server & CNRS access portal
├── styles/
│   ├── tokens.css          # Design tokens, local variable fonts, theme & accent presets
│   └── site.css            # Modular master stylesheet (responsive, print-friendly)
├── js/
│   └── site.js             # Client engine: interactive design studio, filters, 2R kinematics
├── assets/
│   ├── fonts/              # Local variable fonts (Space Grotesk, Inter, Newsreader, IBM Plex)
│   ├── icons/              # Verified UI icons (PNGs for cite, PDF, links, social)
│   └── images/             # Profile portraits, project figures
├── projects/
│   ├── cnrs26/             # CNRS interview dossier & teleprompter
│   ├── epfl_course/        # EPFL ENG-654 course overview & lectures
│   └── journal_webpages/   # Dedicated paper microsites (e.g., IEEE RA-L 2025)
├── lectures/               # ENG-654 lecture slide decks (Lectures 01 to 08)
└── personal_website_backup.zip  # Full backup archive preserved prior to overhaul
```

---

## 🎨 Interactive Design & Typography Studio

The website includes a live **Design & Typography Studio** (accessible via the `Studio ✦` button in the top navigation):
* **Typography Pairings:** Switch between *Space Grotesk + Inter* (Kinematic Hybrid), *Newsreader + Inter* (Academic Editorial), *Space Grotesk Only* (Tech), or *IBM Plex Sans* (Humanist).
* **Reading Density:** Select between Compact (15px), Standard (16.5px), and Large (18px) text scales.
* **Accent Moods:** Choose from *Halycon Emerald*, *Warm Amber*, *Horizon Sky*, *Solar Coral*, or *Electric Lilac*.
* **Canvas Modes:** Toggle between *Cosmic Dark* (`#03122b`) and *Academic Light* (`#f8fafc`).
Preferences automatically persist across sessions in `localStorage`.

---

## 📄 License & Attribution

All research publications, manuscripts, and slides remain the copyright of their respective authors and publishers (AAAS, IEEE, SAGE, Elsevier). Website code and design architecture are maintained by Durgesh Salunkhe.
