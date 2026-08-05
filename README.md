# Smart Personal Expense Manager

A full-stack personal finance application built with Spring Boot and Angular, featuring budget forecasting and automatic transaction categorization.

## Architecture

```text id="u80mk3"
Angular Frontend
       │
       ▼
Spring Boot REST API
       │
       ├── JWT Authentication
       ├── Transaction & Category Management
       ├── Dashboard Analytics
       ├── Budget Forecasting
       │
       └── Categorization Service
                    │
                    ▼
              Python + Flask
                    │
                    ▼
          TF-IDF + Naive Bayes

Spring Boot ──────→ Database
```

## Tech Stack

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Backend        | Java 17, Spring Boot 3.2, Spring Security, JPA/Hibernate |
| Frontend       | Angular 17, Chart.js                                     |
| ML Service     | Python, Flask, Scikit-learn                              |
| Database       | MySQL / PostgreSQL                                       |
| Authentication | JWT, BCrypt                                              |
| Deployment     | Render, Vercel                                           |

## Features

### Core Features

* User registration and login with JWT authentication
* Add, edit, and delete income and expense transactions
* Category management with color coding
* Dashboard with income vs expense and category-wise spending charts
* Paginated and filterable transaction history

### Budget Forecasting

* Predicts next month's spending for each category
* Uses a weighted moving average based on previous monthly spending
* Gives higher importance to recent spending
* Displays forecasted spending and trend direction for each category

### Automatic Transaction Categorization

* Suggests a category based on the merchant or transaction description
* Uses keyword matching for known merchants
* Uses TF-IDF and Naive Bayes classification for other merchant names
* Suggestions appear while entering a transaction and can be applied by the user
* Supports categories including Food, Transport, Entertainment, Shopping, Utilities, Health, Education, and Travel

## API Endpoints

| Method | Endpoint                 | Description                  |
| ------ | ------------------------ | ---------------------------- |
| POST   | `/api/auth/register`     | Register user                |
| POST   | `/api/auth/login`        | Login and receive JWT        |
| GET    | `/api/transactions`      | Retrieve transactions        |
| POST   | `/api/transactions`      | Create transaction           |
| PUT    | `/api/transactions/{id}` | Update transaction           |
| DELETE | `/api/transactions/{id}` | Delete transaction           |
| GET    | `/api/categories`        | Retrieve categories          |
| POST   | `/api/categories`        | Create category              |
| GET    | `/api/dashboard`         | Retrieve dashboard analytics |
| GET    | `/api/forecast`          | Retrieve spending forecast   |
| POST   | `/api/categorize`        | Predict transaction category |
| GET    | `/api/health`            | Health check                 |

## Database Design

* Separate tables for users, categories, and transactions with foreign-key relationships
* Database-side aggregation using `GROUP BY` and `SUM` for dashboard and forecasting queries
* Composite indexes for commonly filtered user transaction queries
* Database connection pooling using HikariCP

## Project Structure

```text id="0x5r99"
expense-manager/
├── backend/
│   └── src/main/java/com/expense/manager/
│       ├── config/
│       ├── controller/
│       ├── dto/
│       ├── entity/
│       ├── exception/
│       ├── repository/
│       ├── security/
│       └── service/
│
├── categorization-service/
│   ├── app.py
│   ├── model.py
│   ├── training_data.py
│   └── requirements.txt
│
├── frontend/
│   └── src/app/
│       ├── core/
│       └── features/
│
└── seed_data.py
```

## Running Locally

### Backend

```bash id="gsr74n"
cd backend
mvn spring-boot:run
```

Spring Boot API:

```text id="dlszby"
http://localhost:8080
```

### Categorization Service

```bash id="7a5c19"
cd categorization-service

python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

python model.py
python app.py
```

Categorization API:

```text id="ktkn45"
http://localhost:5000
```

### Frontend

```bash id="tfb9ja"
cd frontend
npm install
npm start
```

Angular application:

```text id="l90e2p"
http://localhost:4200
```
