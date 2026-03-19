from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.email import router as email_router
from routes.health import router as health_router
from routes.link import router as link_router

app = FastAPI(title="PhishGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(email_router)
app.include_router(link_router)
app.include_router(health_router)