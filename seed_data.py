
import argparse
import random
from datetime import date, timedelta
from calendar import monthrange

try:
    import mysql.connector
except ImportError:
    print("Run: pip install mysql-connector-python")
    raise

random.seed(42)

CATEGORIES = [
    {"name": "Food",          "icon": "utensils",   "color": "#A8432F"},
    {"name": "Transport",     "icon": "car",        "color": "#2D5C4D"},
    {"name": "Entertainment", "icon": "film",       "color": "#C9A961"},
    {"name": "Shopping",      "icon": "bag",        "color": "#4A6B7C"},
    {"name": "Utilities",     "icon": "bolt",       "color": "#6B6660"},
    {"name": "Health",        "icon": "heart",      "color": "#7A9E8E"},
    {"name": "Education",     "icon": "book",       "color": "#8C7A4A"},
    {"name": "Travel",        "icon": "plane",      "color": "#C77B5F"},
]

MERCHANTS = {
    "Food": [
        ("Zomato",          250,  800,  3),
        ("Swiggy",          200,  700,  3),
        ("BigBasket",       800, 2500,  2),
        ("Blinkit",         300,  900,  2),
        ("Cafe Coffee Day",  80,  250,  2),
        ("Starbucks",       200,  500,  1),
        ("Chaayos",          80,  200,  2),
        ("Domino's Pizza",  400,  900,  1),
        ("McDonald's",      300,  700,  1),
        ("Haldiram's",      150,  500,  2),
        ("DMart",          1200, 4000,  1),
        ("Reliance Fresh",  600, 2000,  1),
        ("Zepto",           300,  800,  2),
        ("Natural Ice Cream", 80, 250,  1),
    ],
    "Transport": [
        ("Ola",             150,  500,  3),
        ("Uber",            180,  600,  3),
        ("Rapido",           60,  200,  2),
        ("IRCTC",           300, 2500,  1),
        ("Namma Metro",      30,   80,  3),
        ("FASTag",          200,  800,  1),
        ("HP Petrol",       500, 2000,  1),
        ("Indian Oil",      600, 2200,  1),
        ("RedBus",          400, 1500,  1),
        ("Ola Electric",    100,  400,  1),
    ],
    "Entertainment": [
        ("Netflix",         649,  649,  1),   
        ("Spotify",         119,  119,  1),   
        ("BookMyShow",      300, 1200,  1),
        ("PVR Cinemas",     300, 1000,  1),
        ("Amazon Prime",    299,  299,  1),   
        ("Disney+ Hotstar", 299,  499,  1),
        ("YouTube Premium", 139,  139,  1),
        ("INOX",            250,  800,  1),
        ("Steam",           199, 2999,  1),
    ],
    "Shopping": [
        ("Amazon",          500, 5000,  2),
        ("Flipkart",        400, 4000,  2),
        ("Myntra",          600, 3000,  1),
        ("Ajio",            500, 2500,  1),
        ("Nykaa",           400, 2000,  1),
        ("Reliance Digital",1000,8000,  1),
        ("Decathlon",       500, 4000,  1),
        ("Bewakoof",        400, 1500,  1),
        ("Bata",            500, 3000,  1),
        ("H&M",             800, 3500,  1),
    ],
    "Utilities": [
        ("BESCOM",          800, 2500,  1),   # Electricity
        ("Jio",             239,  839,  1),   # Monthly recharge
        ("Airtel",          299,  999,  1),
        ("BSNL",            199,  699,  1),
        ("ACT Fibernet",    599, 1199,  1),
        ("HP Gas",          900,  950,  1),   # LPG cylinder
        ("Tata Sky",        199,  499,  1),
        ("Water Bill",      200,  600,  1),
    ],
    "Health": [
        ("Apollo Pharmacy", 200, 1500,  1),
        ("MedPlus",         150, 1000,  1),
        ("1mg",             300, 2000,  1),
        ("Practo",          400, 1500,  1),
        ("Cult.fit",        699, 2499,  1),
        ("Thyrocare",       400, 1200,  1),
        ("Gold's Gym",      800, 2000,  1),
        ("Doctor Consultation", 300, 1200, 1),
        ("Dental Clinic",   500, 5000,  1),
    ],
    "Education": [
        ("Coursera",        300, 4999,  1),
        ("Udemy",           399,  699,  1),
        ("Scaler",         1000, 5000,  1),
        ("LeetCode",        299, 2999,  1),
        ("LinkedIn Learning",339,  339,  1),
        ("Books",           200, 1500,  1),
        ("Stationery",       50,  500,  2),
        ("GeeksForGeeks",   299,  599,  1),
    ],
    "Travel": [
        ("MakeMyTrip",     1500,15000,  1),
        ("OYO",             800, 5000,  1),
        ("IndiGo",         2000,12000,  1),
        ("Airbnb",         2000,10000,  1),
        ("goibibo",        1500,12000,  1),
    ],
}


MONTHLY_MULTIPLIERS = {
    "Food":          [0.80, 0.85, 0.90, 1.00, 1.10, 1.20, 0.60],  # UP trend
    "Transport":     [1.30, 1.20, 1.10, 1.00, 0.90, 0.80, 0.40],  # DOWN trend
    "Entertainment": [1.00, 0.90, 1.10, 1.00, 0.95, 1.05, 0.55],  # STABLE
    "Shopping":      [0.70, 0.80, 1.50, 0.70, 0.80, 1.20, 0.50],  # spikes (sales)
    "Utilities":     [1.10, 1.00, 0.90, 0.85, 1.10, 1.15, 0.60],  # slight summer UP
    "Health":        [0.90, 1.20, 1.00, 0.80, 1.00, 0.90, 0.45],  # mild variation
    "Education":     [1.20, 1.10, 0.80, 0.70, 0.90, 1.00, 0.50],  # DOWN after sem
    "Travel":        [0.60, 1.50, 0.80, 1.80, 0.60, 1.20, 0.30],  # holiday spikes
}

# ─── Transactions per month per category (base count, scaled by multiplier) ──
BASE_TX_COUNT = {
    "Food":          12,
    "Transport":     10,
    "Entertainment":  3,
    "Shopping":       4,
    "Utilities":      5,
    "Health":         2,
    "Education":      2,
    "Travel":         1,
}

# ─── Income entries: 1 salary + occasional freelance ─────────────────────────
INCOME_ENTRIES = [
    ("Monthly Salary",   45000,  55000),
    ("Freelance Project", 5000,  20000),
    ("Internship Stipend", 8000, 15000),
]


def get_month_dates(year: int, month: int):
    """Return (first_day, last_day) for a given year/month."""
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def random_date_in_month(year: int, month: int, is_current: bool = False) -> date:
    """Return a random date within the month. For current month, cap at today."""
    first, last = get_month_dates(year, month)
    if is_current:
        last = min(last, date.today())
    delta = (last - first).days
    return first + timedelta(days=random.randint(0, delta))


def build_months():
    """Returns list of (year, month, month_index, is_current) for 6 full months + current partial."""
    today = date.today()
    current_ym = (today.year, today.month)
    months = []
    for i in range(6, 0, -1):
        d = (today.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
        months.append((d.year, d.month, 6 - i, False))
    # Current month (partial)
    months.append((today.year, today.month, 6, True))
    return months


def get_or_create_user(cursor, email: str) -> int:
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = cursor.fetchone()
    if row:
        print(f"Found existing user: {email} (id={row[0]})")
        return row[0]
    raise ValueError(
        f"User '{email}' not found in the database.\n"
        "Register through the expense manager app first, then re-run this script."
    )


def get_or_create_categories(cursor, conn, user_id: int) -> dict:
    """Returns {category_name: category_id} — creates missing ones."""
    cursor.execute("SELECT id, name FROM categories WHERE user_id = %s", (user_id,))
    existing = {row[1]: row[0] for row in cursor.fetchall()}

    for cat in CATEGORIES:
        if cat["name"] not in existing:
            cursor.execute(
                "INSERT INTO categories (name, icon, color, user_id) VALUES (%s, %s, %s, %s)",
                (cat["name"], cat["icon"], cat["color"], user_id)
            )
            existing[cat["name"]] = cursor.lastrowid
            print(f"  Created category: {cat['name']}")
        else:
            print(f"  Found category: {cat['name']} (id={existing[cat['name']]})")

    conn.commit()
    return existing


def generate_transactions(user_id: int, category_map: dict) -> list:
    """Generate all transaction rows as dicts."""
    transactions = []
    months = build_months()

    for year, month, month_idx, is_current in months:
        month_label = date(year, month, 1).strftime("%B %Y")

        for cat_name, merchants in MERCHANTS.items():
            cat_id = category_map.get(cat_name)
            if not cat_id:
                continue

            multiplier = MONTHLY_MULTIPLIERS[cat_name][month_idx]
            base_count = BASE_TX_COUNT[cat_name]
            count = max(1, round(base_count * multiplier))

            # Build a weighted merchant pool for this category
            pool = []
            for m in merchants:
                merchant_name, low, high, weight = m
                pool.extend([m] * weight)

            for _ in range(count):
                merchant_name, low, high, _ = random.choice(pool)
                amount = round(random.uniform(low, high), 2)
                tx_date = random_date_in_month(year, month, is_current)

                transactions.append({
                    "title": merchant_name,
                    "description": None,
                    "amount": amount,
                    "type": "EXPENSE",
                    "transaction_date": tx_date,
                    "user_id": user_id,
                    "category_id": cat_id,
                })

        # Add 1 salary per month (always on the 1st)
        salary_title, sal_low, sal_high = INCOME_ENTRIES[0]
        salary_date = date(year, month, 1)
        if is_current and salary_date > date.today():
            salary_date = date.today()
        transactions.append({
            "title": salary_title,
            "description": "Monthly salary credit",
            "amount": round(random.uniform(sal_low, sal_high), 2),
            "type": "INCOME",
            "transaction_date": salary_date,
            "user_id": user_id,
            "category_id": None,
        })

        # Occasional freelance income (30% chance per month)
        if random.random() < 0.30:
            fl_title, fl_low, fl_high = INCOME_ENTRIES[1]
            fl_date = random_date_in_month(year, month, is_current)
            transactions.append({
                "title": fl_title,
                "description": None,
                "amount": round(random.uniform(fl_low, fl_high), 2),
                "type": "INCOME",
                "transaction_date": fl_date,
                "user_id": user_id,
                "category_id": None,
            })

    return transactions


def insert_transactions(cursor, conn, transactions: list):
    sql = """
        INSERT INTO transactions
            (title, description, amount, type, transaction_date, user_id, category_id, created_at, updated_at)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """
    rows = [
        (
            t["title"], t["description"], t["amount"], t["type"],
            t["transaction_date"], t["user_id"], t["category_id"]
        )
        for t in transactions
    ]
    cursor.executemany(sql, rows)
    conn.commit()


def print_summary(transactions: list):
    from collections import defaultdict
    by_cat = defaultdict(lambda: {"count": 0, "total": 0.0})
    income_total = 0.0
    for t in transactions:
        if t["type"] == "EXPENSE":
            cat = t["title"]  # approximate — real grouping is by category_id
        else:
            income_total += t["amount"]
            continue
    # Group by a rough category proxy (first word of merchant = good enough for summary)
    cat_totals = defaultdict(float)
    cat_counts = defaultdict(int)
    for t in transactions:
        if t["type"] == "EXPENSE":
            for cat_name, merchants in MERCHANTS.items():
                if any(t["title"] == m[0] for m in merchants):
                    cat_totals[cat_name] += t["amount"]
                    cat_counts[cat_name] += 1
                    break

    print("\n─── Seed data summary ───────────────────────────────────────")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "EXPENSE")
    total_income = sum(t["amount"] for t in transactions if t["type"] == "INCOME")
    total_tx = len(transactions)
    print(f"Total transactions inserted : {total_tx}")
    print(f"Total expense               : ₹{total_expense:,.2f}")
    print(f"Total income                : ₹{total_income:,.2f}")
    print(f"\nExpenses by category:")
    for cat, total in sorted(cat_totals.items(), key=lambda x: -x[1]):
        print(f"  {cat:15s} : ₹{total:>10,.2f}  ({cat_counts[cat]} transactions)")
    print("\n─────────────────────────────────────────────────────────────")
    print("✓ Forecasting: open the dashboard — you should see the 'Predicted spending' card")
    print("✓ Auto-category: open 'New transaction' and type 'Zomato' or 'Netflix'")
    print("  You should see a green suggestion chip appear after ~400ms")


def main():
    parser = argparse.ArgumentParser(description="Seed sample data for Smart Expense Manager")
    parser.add_argument("--host",       default="localhost")
    parser.add_argument("--port",       type=int, default=3306)
    parser.add_argument("--database",   default="expense_db")
    parser.add_argument("--db-user",    default="root")
    parser.add_argument("--db-password",required=True, help="MySQL password")
    parser.add_argument("--user-email", required=True, help="Email of the account to seed data into")
    parser.add_argument("--clear",      action="store_true",
                        help="Delete existing transactions for this user before inserting (safe — only touches your data)")
    args = parser.parse_args()

    print(f"Connecting to MySQL at {args.host}:{args.port}/{args.database}...")
    conn = mysql.connector.connect(
        host=args.host, port=args.port,
        user=args.db_user, password=args.db_password,
        database=args.database
    )
    cursor = conn.cursor()

    # Get the user
    user_id = get_or_create_user(cursor, args.user_email)

    # Create / find categories
    print("\nSetting up categories...")
    category_map = get_or_create_categories(cursor, conn, user_id)

    # Optionally clear existing data for this user
    if args.clear:
        cursor.execute("DELETE FROM transactions WHERE user_id = %s", (user_id,))
        conn.commit()
        print(f"\nCleared existing transactions for user {args.user_email}")

    # Generate and insert
    print("\nGenerating 7 months of transaction history...")
    transactions = generate_transactions(user_id, category_map)
    print(f"Inserting {len(transactions)} transactions...")
    insert_transactions(cursor, conn, transactions)

    cursor.close()
    conn.close()

    print_summary(transactions)


if __name__ == "__main__":
    main()
