# 📦 StockVault

> **Enterprise-Grade Inventory & Order Management Dashboard**

A high-performance, zero-dependency web application engineered for real-time inventory tracking, multi-tier order management, and seamless client-side state persistence. Built entirely with modern vanilla web technologies to eliminate framework bloat and maximize execution speed.

---

## 🚀 Tech Stack & Architecture

StockVault relies on native browser APIs and modular DOM architecture rather than heavy external frameworks:

* **Core Language:** JavaScript (ES6+) / Vanilla JS
* **Markup & Styling:** HTML5, CSS3 (Responsive Design)
* **Data Management & State:** Browser `localStorage` (Client-Side Serialization)
* **Architecture Pattern:** Modular Multi-Page Architecture with Dynamic DOM Injection
* **Version Control & Tools:** Git, GitHub, VS Code

---

## ✨ Core Features & Engineering Highlights

* **Modular Multi-Page Architecture:** Built with clean routing and separation of concerns across core views (Overview, Inventory, Orders, and Settings).
* **Centralized Layout Engine (`shell.js`):** Implemented dynamic DOM injection to enforce the DRY (Don't Repeat Yourself) principle, decoupling global navigation and structural markup.
* **Visibility-Driven Global Search:** Developed a responsive search utility that evaluates computed layout styles (`window.getComputedStyle`) to query active DOM nodes dynamically without memory leaks.
* **Resilient State Persistence:** Engineered complete order management CRUD (Create, Read, Update, Delete) operations backed by browser `localStorage` serialization and real-time metric calculations.

---

## 📂 Project Structure

```text
StockVault/
│
├── index.html          # Main application entry point
├── css/
│   └── styles.css      # Responsive enterprise dashboard styling
├── js/
│   ├── shell.js        # Centralized layout engine & dynamic DOM injection
│   ├── app.js          # Core application logic & event listeners
│   └── storage.js      # LocalStorage serialization & CRUD management
└── assets/             # Icons, images, and static resources
