<div align="center">

  <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop" alt="StockVault Banner" width="100%" style="border-radius: 8px; margin-bottom: 20px;" />

  # 🚀 StockVault
  ### Enterprise-Grade Inventory & Order Management Dashboard

  [![Status](https://img.shields.io/badge/Status-Active%20Development-success?style=for-the-badge&logo=git&logoColor=white)]()
  [![Version](https://img.shields.io/badge/Version-1.4.2-blue?style=for-the-badge&logo=semver&logoColor=white)]()
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=opensourceinitiative&logoColor=white)]()
  [![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-brightgreen?style=for-the-badge)]()

  *A high-performance, modular web application engineered for real-time inventory tracking, multi-tier order management, and secure administrative workflows.*

  [View Live Demo](#-visual-demo) · [Report Bug](https://github.com/YOUR-USERNAME/StockVault/issues) · [Request Feature](https://github.com/YOUR-USERNAME/StockVault/issues)

</div>

---

## 🛠️ Tech Stack & Architecture

StockVault is built on a zero-dependency, modern vanilla web architecture designed for maximum execution speed and zero framework bloat:

<div align="center">

  ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
  ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
  ![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
  ![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white)

</div>

---

## 📑 Table of Contents
- [About The Project](#-about-the-project)
- [Visual Demo](#-visual-demo)
- [Core Features](#-core-features)
- [Engineering Highlights](#-engineering-highlights--design-decisions)
- [Project Evolution & Changelog](#-project-evolution--changelog)
- [Getting Started & Setup](#-getting-started--setup)
- [Architecture Map](#-architecture-map)
- [License](#-license)

---

## 💡 About The Project

StockVault was engineered to solve the complexity of lightweight dashboard management. Rather than relying on heavy frontend frameworks that introduce performance overhead, StockVault leverages native browser APIs and modular DOM injection to deliver a seamless multi-page user experience.

---

## 🖥️ Visual Demo

> *Replace the placeholder link below with a real screenshot or GIF of your running StockVault dashboard once you take one!*

<div align="center">
  <img src="https://via.placeholder.com/900x450/0f172a/38bdf8?text=StockVault+Dashboard+Preview" alt="StockVault Demo" width="100%" style="border-radius: 6px;" />
</div>

---

## ✨ Core Features

* **Multi-Page Application Architecture:** Modular routing across Overview, Inventory, Orders, Settings, Account, and Billing modules.
* **Dynamic Layout Injection (`shell.js`):** Centralized navigation generation enforcing strict DRY (Don't Repeat Yourself) principles.
* **Render-State Universal Search:** High-performance global search utility that dynamically evaluates DOM layout visibility (`display !== 'none'`) to filter active table contexts instantly.
* **Full Order Management Lifecycle:** Comprehensive CRUD operations backed by modal form validations, dynamic status badge rendering, and bulk selection controls.
* **Client-Side State Persistence:** Resilient session management backed by browser `localStorage` and real-time metric calculation engines.

---

## 🧠 Engineering Highlights & Design Decisions

* **Zero-Dependency Footprint:** Eliminates `node_modules` bloat, guaranteeing instantaneous browser execution and maximum compatibility.
* **Layout-Visibility-Driven Search:** Bypasses heavy virtual DOM diffing by directly interrogating computed styles (`window.getComputedStyle`) to query active DOM nodes safely.
* **Synchronous State Engine:** Custom serialization layers over browser storage for zero-latency data persistence across reloads.

---

## 🔄 Project Evolution & Changelog

* **v1.4.2 (Current):** Refactored global search to utilize layout-visibility checking; implemented full Orders CRUD dashboard with live metric calculators.
* **v1.3.0:** Introduced `shell.js` dynamic layout engine to decouple sidebar markup from page files.
* **v1.2.0:** Built out the Inventory multi-tab matrix with isolated DOM scopes.
* **v1.1.0:** Established core design system (`style.css`), custom typography, and CSS variables.
* **v1.0.0:** Initial repository setup, HTML shell structuring, and routing guards.

---

## 📦 Getting Started & Setup

Follow these steps to run the project locally on your machine:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR-USERNAME/StockVault.git](https://github.com/YOUR-USERNAME/StockVault.git)