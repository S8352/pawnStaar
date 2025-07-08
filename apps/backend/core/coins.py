from sqlalchemy.orm import Session
import models
import schemas

class CoinService:
    def __init__(self, db: Session):
        self.db = db

    def get_balance(self, user_id: str) -> int:
        """
        Retrieves the current coin balance for a user.
        """
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        return user.coin_balance if user else 0

    def credit(self, user_id: str, amount: int, description: str) -> models.CoinTransaction:
        """
        Credits a user's account with a specified amount of coins and records the transaction.
        """
        if amount < 0:
            raise ValueError("Credit amount cannot be negative.")

        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise ValueError("User not found.")

        user.coin_balance += amount
        
        transaction = models.CoinTransaction(
            user_id=user_id,
            amount=amount,
            description=description
        )
        
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        
        return transaction

    def debit(self, user_id: str, amount: int, description: str) -> models.CoinTransaction:
        """
        Debits a user's account by a specified amount of coins and records the transaction.
        Checks for sufficient balance before debiting.
        """
        if amount <= 0:
            raise ValueError("Debit amount must be positive.")

        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise ValueError("User not found.")
        
        if user.coin_balance < amount:
            raise ValueError("Insufficient funds.")

        user.coin_balance -= amount

        transaction = models.CoinTransaction(
            user_id=user_id,
            amount=-amount, # Store debit as a negative value
            description=description
        )

        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

        return transaction
