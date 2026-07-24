# Smart Personal Expense Manager

A full-stack personal finance application built with Spring Boot and Angular, featuring two ML-powered "Smart" features that go beyond basic CRUD: **predictive budget forecasting** and **NLP-based automatic transaction categorization**.

## Why "Smart"

Most expense trackers just show what you already spent. This one does two things that actually justify the name:

1. **Predicts what you'll spend next month** — weighted moving average over 6 months of per-category history, with trend signals (↑ UP / ↓ DOWN / → STABLE) surfaced on the dashboard
2. **Categorizes transactions automatically** — type "Zomato" and the system fills in "Food" before you submit; uses a two-stage hybrid model (keyword lookup + TF-IDF/Naive Bayes) trained on 270 Indian merchant names

## Architecture

```
Angular Frontend (Vercel)
        │
        ├──→ Spring Boot API (Render, port 8080)
        │         ├── JWT Auth (Spring Security)
        │         ├── Transaction CRUD
        │         ├── Categories CRUD  
        │         ├── Dashboard + Chart aggregations
        │         ├── Budget Forecasting (weighted moving average, pure Java)
        │         └── Categorization proxy (WebClient → Python microservice)
        │
        └──→ Python Categorization Service (port 5000)
                  └── TF-IDF char n-grams + Naive Bayes
                      trained on 270 Indian merchants
```

The Python microservice is a separate deployable, justified by a real technical constraint: Scikit-learn runs on CPython and cannot be called directly from the JVM. Spring Boot calls it via WebClient (non-blocking, 3s timeout), falling back silently if the service is unavailable — auto-categorization is enhancement, not a hard dependency.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.2, Spring Security, JPA/Hibernate |
| Frontend | Angular 17 (standalone components, signals, lazy routes) |
| ML Service | Python, Flask, Scikit-learn (TF-IDF + Naive Bayes) |
| Database | MySQL (local) / PostgreSQL (Render, production) |
| Auth | JWT (stateless, BCrypt password hashing) |
| Deployment | Render (API + DB), Vercel (frontend) |

## Features

### Core
- Register/login with JWT authentication
- Add, edit, delete income and expense transactions
- Category management with color coding
- Dashboard with income vs expense bar chart and category doughnut chart (Chart.js)
- Paginated, filterable transaction list

### Smart Features

**Budget Forecasting**
- Weighted moving average over 6 months of per-category spending
- More weight on recent months (35% last month, 5% six months ago) — reflects how personal spending actually evolves
- Shows forecasted amount, last month's actual, and trend direction per category
- Requires 2+ months of history to activate; shows "Add more transactions" prompt otherwise

**Auto-Categorization**
- Two-stage hybrid: exact/substring keyword match first, ML fallback for unseen merchants
- Keyword stage: ~100% accuracy on known merchants (Zomato, IRCTC, Netflix, etc.)
- ML stage: 46% leave-one-out accuracy on genuinely unseen brand names
- Appears as a dismissible suggestion chip while typing; one click to apply
- 8 categories: Food, Transport, Entertainment, Shopping, Utilities, Health, Education, Travel
- 270 training merchants covering Indian brands (Zomato, Swiggy, IRCTC, BookMyShow, BESCOM, etc.)

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/transactions` | List (paginated, filterable by type/date) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/{id}` | Update transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/categories` | List user's categories |
| POST | `/api/categories` | Create category |
| GET | `/api/dashboard` | Chart data (monthly trend + category breakdown) |
| GET | `/api/forecast` | Next-month spend forecast per category |
| POST | `/api/categorize` | Predict category for a merchant name |
| GET | `/api/health` | Health check |

## Database Design

Key optimizations over a naive schema:

- **Composite indexes** on `(user_id, transaction_date)` and `(user_id, type)` — avoids full table scans for per-user filtered queries
- **DB-side aggregation** for all dashboard and forecast queries — `GROUP BY` + `SUM` in MySQL rather than pulling rows into Java and looping
- **Connection pooling** via Spring's HikariCP — avoids per-request TCP handshake overhead
- **Separate users/categories/transactions tables** with FK constraints — referential integrity enforced at DB level, not just application

## Running Locally

**Backend (Spring Boot):**
```bash
# Prerequisites: Java 17, Maven, MySQL running locally
cd backend
cp src/main/resources/application.properties.example src/main/resources/application.properties
# Edit application.properties with your MySQL password
mvn spring-boot:run
# API on http://localhost:8080
```

**Categorization microservice (Python):**
```bash
cd categorization-service
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
python model.py   # trains the model (first time only, ~5 seconds)
python app.py     # runs on http://localhost:5000
```

**Frontend (Angular):**
```bash
cd frontend
npm install
npm start
# Opens on http://localhost:4200
```

**Seed sample data (6 months of realistic transactions):**
```bash
# Register an account in the app first, then:
python seed_data.py --user-email your@email.com --db-password yourpassword
# Inserts 266 transactions across 8 categories, Jan–July 2026
```

## Project Structure

```
expense-manager/
├── backend/                    # Spring Boot application
│   └── src/main/java/com/expense/manager/
│       ├── config/             # Security config, CORS
│       ├── controller/         # REST controllers (Auth, Transaction, Category,
│       │                       #   Dashboard, Forecast, Categorization)
│       ├── dto/                # Request/response DTOs
│       ├── entity/             # JPA entities (User, Transaction, Category)
│       ├── exception/          # GlobalExceptionHandler
│       ├── repository/         # Spring Data JPA with custom JPQL queries
│       ├── security/           # JWT filter, UserDetailsService
│       └── service/            # Business logic
├── categorization-service/     # Python NLP microservice
│   ├── app.py                  # Flask REST API
│   ├── model.py                # Hybrid keyword + ML prediction
│   ├── training_data.py        # 270 Indian merchant → category pairs
│   └── requirements.txt
├── frontend/                   # Angular 17 application
│   └── src/app/
│       ├── core/               # Services, interceptors, guards, models
│       └── features/           # Auth, Dashboard, Transactions, Categories
└── seed_data.py                # Sample data generator (6 months history)
```

## Design Notes

**Why not a transformer/BERT for categorization?**
Merchant names are 1-4 words. Transformers add 200MB+ dependencies and require GPU or slow CPU inference — unacceptable for a "suggest as you type" UX where every 100ms matters. TF-IDF character n-grams + Naive Bayes is genuinely the industry-standard approach for short-text classification at this scale. Mint, Monzo, and similar apps use this same pattern.

**Why weighted moving average instead of ARIMA?**
ARIMA needs 30+ data points per series to be statistically meaningful. A personal user might have 3-6 months of per-category spending history — 3-6 data points. WMA gives honest, explainable results on small data. "Recent months matter more than old ones" is also true for personal spending behavior in a way that a stationary ARIMA model doesn't capture.

**Why a separate Python microservice instead of bundling into Spring Boot?**
Real technical constraint, not an architecture astronaut choice: Scikit-learn runs on CPython. There's no JVM port. Options were: subprocess calls (fragile), Jython (outdated, doesn't support NumPy), or a separate service. The separate service is also independently scalable — if categorization traffic grows, you scale it without touching the main API.
