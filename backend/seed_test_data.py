from app.database import SessionLocal
from app.models import User, Paper, Workspace

def seed_correct_papers():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "test@research.ai").first()
    if not user:
        print("User not found")
        return

    # Create workspace if not exists
    ws = db.query(Workspace).filter(Workspace.owner_id == user.id, Workspace.name == "AI Research Tech & Ethics").first()
    if not ws:
        ws = Workspace(name="AI Research Tech & Ethics", description="Comparison of molecular design and moral agency", owner_id=user.id)
        db.add(ws)
        db.commit()
        db.refresh(ws)

    # Clear old papers in this workspace
    db.query(Paper).filter(Paper.workspace_id == ws.id).delete()

    # Paper 1: Molecular Design (Nature)
    p1 = Paper(
        title="Machine learning for molecular design",
        authors="Zhavoronkov, A., et al.",
        abstract="Traditional drug discovery is slow and expensive. Recent advances in deep learning, particularly generative models like VAEs and GANs, enable the rapid generation of novel molecular structures with desired properties. This paper reviews the state-of-the-art in machine learning for molecular design, emphasizing the shift from manual curation to automated, AI-driven structure-activity relationship (SAR) analysis.",
        year=2019,
        source="Nature",
        workspace_id=ws.id
    )

    # Paper 2: Moral Agency
    p2 = Paper(
        title="On the Moral Agency of Artificial Intelligence",
        authors="Tigard, D. W.",
        abstract="As AI systems become more autonomous, questions of moral agency arise. This paper investigates whether artificial systems can meet the criteria for moral agency, such as intentionality and normative competence. It concludes that while AI may lack fully human-like agency, we should consider 'distributed responsibility' frameworks to handle AI-generated outcomes effectively.",
        year=2020,
        source="Springer",
        workspace_id=ws.id
    )

    db.add(p1)
    db.add(p2)
    db.commit()
    print(f"Seeded workspace '{ws.name}' with 2 papers.")
    db.close()

if __name__ == "__main__":
    seed_correct_papers()
