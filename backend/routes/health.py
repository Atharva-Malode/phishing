from fastapi import APIRouter
from core.models import model, vectorizer, classifier

router = APIRouter()

@router.get("/health")
def health():
    return {
        "model": model is not None,
        "vectorizer": vectorizer is not None,
        "classifier": classifier is not None
    }