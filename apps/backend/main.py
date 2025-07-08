from fastapi import FastAPI
from routers import auth, users, analysis, import_router, dashboard, live, coins, lessons, workouts
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from core.config import settings

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration(auto_enable=True)],
    traces_sample_rate=0.1,
)

app = FastAPI()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(import_router.router, prefix="/import", tags=["import"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(live.router, prefix="/live", tags=["live"])
app.include_router(coins.router, prefix="/coins", tags=["coins"])
app.include_router(lessons.router, prefix="/lessons", tags=["lessons"])
app.include_router(workouts.router, prefix="/workouts", tags=["workouts"])

@app.get("/")
def read_root():
    return {"Hello": "PawnStaar"}
