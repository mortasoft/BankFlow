from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TransactionBase(BaseModel):
    amount: float
    type: str
    description: str

class Transaction(TransactionBase):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True

class AccountBase(BaseModel):
    account_number: str
    balance: float

class Holding(BaseModel):
    id: int
    symbol: str
    name: str
    shares: float
    avg_price: float
    class Config:
        from_attributes = True

class Account(AccountBase):
    id: int
    owner_id: int
    transactions: List[Transaction] = []
    holdings: List[Holding] = []
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str

class User(UserBase):
    id: int
    accounts: List[Account] = []
    class Config:
        from_attributes = True
