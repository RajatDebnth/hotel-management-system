from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.db.session import get_db_session
from app.schemas.auth import AuthenticatedUser
from app.schemas.reports import DashboardSummary, OccupancyReport, RevenueReport
from app.services.reports import dashboard_summary, occupancy_report, revenue_report

router = APIRouter(prefix="/admin", tags=["admin reports"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def summary(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    report_date: date | None = None,
) -> DashboardSummary:
    return await dashboard_summary(session, report_date or date.today())


@router.get("/reports/occupancy", response_model=OccupancyReport)
async def occupancy(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    start_date: date | None = None,
    end_date: date | None = None,
) -> OccupancyReport:
    start = start_date or date.today()
    return await occupancy_report(session, start, end_date or start + timedelta(days=30))


@router.get("/reports/revenue", response_model=RevenueReport)
async def revenue(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    start_date: date | None = None,
    end_date: date | None = None,
) -> RevenueReport:
    start = start_date or date.today()
    return await revenue_report(session, start, end_date or start + timedelta(days=30))
