from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("/", response_model=List[schemas.WorkspaceOut])
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    workspaces = db.query(models.Workspace).filter(
        models.Workspace.owner_id == current_user.id
    ).all()
    result = []
    for ws in workspaces:
        ws_out = schemas.WorkspaceOut(
            id=ws.id,
            name=ws.name,
            description=ws.description or "",
            created_at=ws.created_at,
            owner_id=ws.owner_id,
            paper_count=len(ws.papers)
        )
        result.append(ws_out)
    return result


@router.post("/", response_model=schemas.WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_data: schemas.WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    workspace = models.Workspace(
        name=workspace_data.name,
        description=workspace_data.description or "",
        owner_id=current_user.id
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return schemas.WorkspaceOut(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description or "",
        created_at=workspace.created_at,
        owner_id=workspace.owner_id,
        paper_count=0
    )


@router.get("/{workspace_id}", response_model=schemas.WorkspaceOut)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return schemas.WorkspaceOut(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description or "",
        created_at=workspace.created_at,
        owner_id=workspace.owner_id,
        paper_count=len(workspace.papers)
    )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete(workspace)
    db.commit()
