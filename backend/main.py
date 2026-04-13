from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import redis
import json
from typing import List

import models, schemas, database
from database import engine, get_db

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BankFlow API")

# Redis configuration
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/balance/{account_number}")
async def get_balance(account_number: str, db: Session = Depends(get_db)):
    # Try cache first
    cached_balance = redis_client.get(f"balance:{account_number}")
    if cached_balance:
        return {"account_number": account_number, "balance": float(cached_balance), "source": "cache"}
    
    account = db.query(models.Account).filter(models.Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Update cache
    redis_client.setex(f"balance:{account_number}", 60, str(account.balance))
    
    return {"account_number": account_number, "balance": account.balance, "source": "db"}

@app.get("/api/transactions/{account_number}", response_model=List[schemas.Transaction])
async def get_transactions(account_number: str, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return account.transactions

@app.get("/api/accounts")
async def get_accounts(db: Session = Depends(get_db)):
    # In a real app we would filter by current user
    return db.query(models.Account).all()

@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    if db.query(models.User).count() == 0:
        new_user = models.User(
            username="demo_user",
            full_name="John Doe",
            email="demo@bankflow.com",
            hashed_password="hashed_placeholder"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Checking Account
        acc1 = models.Account(
            account_number="ACC-12345",
            balance=5420.50,
            owner_id=new_user.id
        )
        # Savings Account
        acc2 = models.Account(
            account_number="SAV-99887",
            balance=12750.00,
            owner_id=new_user.id
        )
        # Investment Account
        acc3 = models.Account(
            account_number="INV-44556",
            balance=45200.25,
            owner_id=new_user.id
        )
        db.add_all([acc1, acc2, acc3])
        db.commit()

        # Add Holdings to Investment Account
        h1 = models.Holding(account_id=acc3.id, symbol="AAPL", name="Apple Inc.", shares=10.5, avg_price=175.20)
        h2 = models.Holding(account_id=acc3.id, symbol="MSFT", name="Microsoft Corp.", shares=15.0, avg_price=310.45)
        h3 = models.Holding(account_id=acc3.id, symbol="BTC", name="Bitcoin", shares=0.12, avg_price=42000.00)
        db.add_all([h1, h2, h3])
        db.commit()
        
        # Add 30 random transactions for ACC-12345
        import random
        from datetime import datetime, timedelta
        
        descriptions = [
            ("Supermarket", "withdrawal"), ("Netflix", "withdrawal"), ("Amazon", "withdrawal"),
            ("Spotify", "withdrawal"), ("Apple Music", "withdrawal"), ("Apartment Rent", "withdrawal"),
            ("Gym", "withdrawal"), ("Freelance Project", "deposit"), ("Monthly Salary", "deposit"),
            ("Starbucks", "withdrawal"), ("Uber", "withdrawal"), ("Gas Station", "withdrawal"),
            ("Dinner Out", "withdrawal"), ("Dividends", "deposit"), ("Tax Refund", "deposit"),
            ("Cloud Storage", "withdrawal"), ("Steam Game", "withdrawal"), ("Gift", "deposit")
        ]
        
        txs = []
        for i in range(30):
            desc, tx_type = random.choice(descriptions)
            if tx_type == "deposit":
                amount = round(random.uniform(50, 2500), 2)
            else:
                amount = round(random.uniform(-500, -5), 2)
            
            # Random date within the last 45 days
            random_days = random.randint(0, 45)
            ts = datetime.utcnow() - timedelta(days=random_days)
            
            txs.append(models.Transaction(
                account_id=acc1.id, 
                amount=amount, 
                type=tx_type, 
                description=desc,
                timestamp=ts
            ))
        
        db.add_all(txs)
        db.commit()
        
        return {"msg": "Data seeded successfully"}
    return {"msg": "Data already exists"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8013)
