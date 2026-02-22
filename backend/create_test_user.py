from app.database import SessionLocal, engine
from app.models import Base, User
from app.auth import hash_password

def create_test_user():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clean output by deleting existing test user first to ensure fresh state
    existing = db.query(User).filter(User.email == "test@research.ai").first()
    if existing:
        db.delete(existing)
        db.commit()
        print("Existing user removed.")
    
    # Create new test user with correct hash
    test_user = User(
        email="test@research.ai",
        username="researcher",
        hashed_password=hash_password("password123")
    )
    db.add(test_user)
    db.commit()
    print("Test account 'test@research.ai' created with password 'password123'")
    db.close()

if __name__ == "__main__":
    create_test_user()
