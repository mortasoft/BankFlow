from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True)
    hashed_password = Column(String(200))
    full_name = Column(String(100))
    
    accounts = relationship("Account", back_populates="owner")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(20), unique=True, index=True)
    balance = Column(Float, default=0.0)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")
    holdings = relationship("Holding", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    amount = Column(Float)
    type = Column(String(20))
    description = Column(String(200))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    account = relationship("Account", back_populates="transactions")

class Holding(Base):
    __tablename__ = "holdings"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    symbol = Column(String(10), index=True)
    name = Column(String(100))
    shares = Column(Float)
    avg_price = Column(Float)
    
    account = relationship("Account", back_populates="holdings")
