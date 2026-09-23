from fastapi import APIRouter

from app.api.v1.routes.admin_inventory import router as admin_inventory_router
from app.api.v1.routes.admin_operations import router as admin_operations_router
from app.api.v1.routes.admin_users import router as admin_users_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.bookings import router as bookings_router
from app.api.v1.routes.catalog import router as catalog_router
from app.api.v1.routes.enquiries import router as enquiries_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.profiles import router as profiles_router
from app.api.v1.routes.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(admin_inventory_router)
api_router.include_router(admin_operations_router)
api_router.include_router(admin_users_router)
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(bookings_router)
api_router.include_router(catalog_router)
api_router.include_router(enquiries_router)
api_router.include_router(profiles_router)
api_router.include_router(reports_router)
