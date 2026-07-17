# LITTORA POS

A full-featured Point of Sale system built for baby product retail stores. Designed as a production-ready application with modern UI, dark mode support, and comprehensive business management features.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

<!-- ![Dashboard Screenshot](docs/screenshots/dashboard.png) -->

## Features

### Point of Sale
- **Fast billing** with product search, barcode scanning, and quick-add tiles
- **Split payments** — cash, card, bank transfer, or store credit
- **Thermal receipt printing** (80mm) with store branding
- **Barcode scanner** integration via device camera (html5-qrcode)

### Inventory Management
- **Products & variants** — multiple SKUs per product (size, color, pack)
- **Real-time stock tracking** with low-stock alerts
- **Stock adjustments** with full movement history
- **Image uploads** for product variants

### Purchasing
- **Purchase orders** with supplier management
- **PO workflow** — placed → paid → shipped → received (auto-stocks)
- **Landed cost calculation** with transport charge allocation
- **WhatsApp sharing** for supplier communication
- **Low-stock reorder suggestions**

### Order Management
- **Full order history** with status tracking
- **Refund processing** — partial or full, with optional restocking
- **Refund receipt printing**

### Customer Management
- **Customer database** with phone lookup
- **Loyalty program** — points earning, tier progression (Silver/Gold/Platinum)
- **Store credit** system with ledger tracking
- **Credit repayment** recording

### Analytics Dashboard
- **KPI cards** — daily/weekly/monthly revenue with animated counters
- **Revenue trend** chart with 7D/14D/30D toggle
- **Payment method** breakdown (donut chart)
- **Best sellers** ranking with progress bars
- **Staff performance** comparison
- **Customer insights** — type breakdown, top spenders
- **Low stock alerts** with severity coloring
- **Refund rate** tracking

### UI/UX
- **Dark mode** with system preference detection and manual toggle
- **Responsive layout** — works on desktop, tablet, and mobile
- **Framer Motion** animations — page transitions, staggered lists, modal animations
- **Toast notifications** for user feedback
- **Loading skeletons** with shimmer effect
- **Empty states** with icons and CTAs
- **Inter** font for UI, **JetBrains Mono** for prices/codes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v4, Framer Motion, Recharts |
| Backend | Node.js, Express |
| Database | MySQL 8 |
| Auth | JWT with role-based access (owner/cashier) |
| Fonts | Inter, JetBrains Mono (self-hosted via @fontsource) |

## Architecture

```
LITTORA-pos/
├── backend/
│   └── src/
│       ├── models/          # MySQL queries (mysql2/promise)
│       ├── controllers/     # Request handlers
│       ├── routes/          # Express routers
│       ├── middleware/      # Auth (JWT + role gate)
│       └── server.js        # Express app entry
├── frontend/
│   └── src/
│       ├── pages/           # Route-level components
│       ├── components/      # Shared UI (AppHeader, Modal, Skeleton, etc.)
│       ├── context/         # React contexts (Auth, Theme, Toast)
│       └── api/client.js    # Axios instance
└── database/
    ├── schema.sql           # Table definitions
    └── seed_demo_data.sql   # Demo data (67 orders, 25 customers, 18 products)
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **MySQL** 8.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/LITTORA-pos.git
cd LITTORA-pos

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Database Setup

```bash
# Create the database and import schema
mysql -u root -p < database/schema.sql

# (Optional) Seed demo data for testing
mysql -u root -p LITTORA_db < database/seed_demo_data.sql
```

### Configuration

Create `backend/.env` or update `backend/src/server.js` with your database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=LITTORA_db
JWT_SECRET=your_jwt_secret
```

### Running

```bash
# Terminal 1 — Start the backend
cd backend
node src/server.js
# → API running on http://localhost:5001

# Terminal 2 — Start the frontend
cd frontend
npm run dev
# → App running on http://localhost:5173
```

### Default Login

| Role | Username | Password |
|------|----------|----------|
| Owner | `owner` | `admin 123` |
| Cashier | `cashier1` | `cashier123` |

## Three-System Vision

LITTORA POS is the first of three interconnected systems sharing one MySQL database:

1. **POS System** (this repo) — In-store sales, inventory, and customer management
2. **AI Chatbot** — Customer-facing product discovery and order placement
3. **E-commerce Website** — Online storefront with real-time stock from POS

## License

MIT

---

Built with care as a portfolio project.
