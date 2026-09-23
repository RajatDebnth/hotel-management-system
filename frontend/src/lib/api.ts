import type { components } from "@/lib/api-schema";
import { getPublicEnvironment } from "@/lib/env";

export type Facility = components["schemas"]["FacilityResponse"];
export type CatalogRoom = components["schemas"]["RoomCategoryResponse"];
export type RoomList = components["schemas"]["RoomCategoryListResponse"];
export type Booking = components["schemas"]["BookingResponse"];
export type BookingCreate = components["schemas"]["BookingCreate"];
export type BookingList = components["schemas"]["BookingListResponse"];
export type Profile = components["schemas"]["ProfileResponse"];
export type AdminInventory = components["schemas"]["InventoryResponse"];
export type AdminBookingList = components["schemas"]["AdminBookingList"];
export type AdminEnquiryList = components["schemas"]["AdminEnquiryList"];
export type AdminOption = components["schemas"]["AdminOption"];
export type DashboardSummary = components["schemas"]["DashboardSummary"];
export type OccupancyReport = components["schemas"]["OccupancyReport"];
export type RevenueReport = components["schemas"]["RevenueReport"];
export type AdminUser = components["schemas"]["AdminUser"];
export type ApiRequestContext = { cookie?: string };

async function apiFetch<T>(path: string, init: RequestInit = {}, context: ApiRequestContext = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (context.cookie) headers.set("Cookie", context.cookie);
  const response = await fetch(`${getPublicEnvironment().apiUrl}${path}`, {
    ...init, headers, credentials: "include",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string | Array<{ msg?: string }> } | null;
    const detail = Array.isArray(body?.detail) ? body.detail.map((item) => item.msg).filter(Boolean).join(" ") : body?.detail;
    throw new Error(detail || `API request failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) };
}

type RoomFilters = { page?: number; pageSize?: number; query?: string; checkIn?: string; checkOut?: string; guests?: number; minPrice?: number; maxPrice?: number; category?: string };

export function getRooms({ page = 1, pageSize = 12, query = "", checkIn, checkOut, guests, minPrice, maxPrice, category }: RoomFilters = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (query) params.set("q", query);
  if (checkIn) params.set("check_in", checkIn);
  if (checkOut) params.set("check_out", checkOut);
  if (guests) params.set("guests", String(guests));
  if (minPrice !== undefined) params.set("min_price", String(minPrice));
  if (maxPrice !== undefined) params.set("max_price", String(maxPrice));
  if (category) params.set("category", category);
  return apiFetch<RoomList>(`/api/v1/catalog/rooms?${params}`, { next: { revalidate: 60 } });
}

export function getRoom(slug: string) { return apiFetch<CatalogRoom>(`/api/v1/catalog/rooms/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } }); }
export function getFacilities() { return apiFetch<Facility[]>("/api/v1/catalog/facilities", { next: { revalidate: 60 } }); }
export function createEnquiry(payload: Record<string, string>) { return apiFetch<{ id: string; message: string }>("/api/v1/enquiries", jsonInit("POST", payload)); }
export function createBooking(payload: BookingCreate) { return apiFetch<Booking>("/api/v1/bookings", jsonInit("POST", payload)); }
export function getProfile(context: ApiRequestContext = {}) { return apiFetch<Profile>("/api/v1/me", { cache: "no-store" }, context); }
export function updateProfile(payload: { full_name: string; phone: string | null }) { return apiFetch<Profile>("/api/v1/me", jsonInit("PATCH", payload)); }
export function getBookings(context: ApiRequestContext = {}) { return apiFetch<BookingList>("/api/v1/bookings", { cache: "no-store" }, context); }
export function getBooking(reference: string, context: ApiRequestContext = {}) { return apiFetch<Booking>(`/api/v1/bookings/${encodeURIComponent(reference)}`, { cache: "no-store" }, context); }
export function cancelBooking(reference: string, reason: string) { return apiFetch<Booking>(`/api/v1/bookings/${encodeURIComponent(reference)}/cancel`, jsonInit("POST", { reason })); }
export function getAdminInventory(context: ApiRequestContext = {}) { return apiFetch<AdminInventory>("/api/v1/admin/inventory", { cache: "no-store" }, context); }
export function saveAdminRecord(kind: "categories" | "rooms" | "facilities", payload: unknown, id?: string) { return apiFetch<{ id: string }>(`/api/v1/admin/inventory/${kind}${id ? `/${id}` : ""}`, jsonInit(id ? "PUT" : "POST", payload)); }
export function deleteAdminRecord(kind: string, id: string) { return apiFetch<void>(`/api/v1/admin/inventory/${kind}/${id}`, { method: "DELETE" }); }
export function uploadAdminImage(form: FormData) { return apiFetch<AdminInventory["images"][number]>("/api/v1/admin/inventory/images", { method: "POST", body: form }); }
export function updateAdminImage(id: string, payload: { alt_text: string; sort_order: number; is_cover: boolean }) { return apiFetch<AdminInventory["images"][number]>(`/api/v1/admin/inventory/images/${id}`, jsonInit("PATCH", payload)); }

type OperationsFilters = { page?: number; query?: string; status?: string };
function operationParams(filters: OperationsFilters) {
  const params = new URLSearchParams({ page: String(filters.page ?? 1), page_size: "10" });
  if (filters.query) params.set("q", filters.query);
  if (filters.status) params.set("status", filters.status);
  return params;
}

export function getAdminBookings(filters: OperationsFilters = {}, context: ApiRequestContext = {}) { return apiFetch<AdminBookingList>(`/api/v1/admin/operations/bookings?${operationParams(filters)}`, { cache: "no-store" }, context); }
export function updateAdminBooking(id: string, status: string, reason: string) { return apiFetch<Booking>(`/api/v1/admin/operations/bookings/${id}/status`, jsonInit("PATCH", { status, reason })); }
export function getAdminEnquiries(filters: OperationsFilters = {}, context: ApiRequestContext = {}) { return apiFetch<AdminEnquiryList>(`/api/v1/admin/operations/enquiries?${operationParams(filters)}`, { cache: "no-store" }, context); }
export function updateAdminEnquiry(id: string, payload: { status: string; assigned_to: string | null; admin_notes: string | null }) { return apiFetch<AdminEnquiryList["items"][number]>(`/api/v1/admin/operations/enquiries/${id}`, jsonInit("PATCH", payload)); }
export function getAdminOptions(context: ApiRequestContext = {}) { return apiFetch<AdminOption[]>("/api/v1/admin/operations/admins", { cache: "no-store" }, context); }
export function getDashboardSummary(reportDate?: string, context: ApiRequestContext = {}) { return apiFetch<DashboardSummary>(`/api/v1/admin/dashboard/summary${reportDate ? `?report_date=${encodeURIComponent(reportDate)}` : ""}`, { cache: "no-store" }, context); }
export function getOccupancyReport(startDate: string, endDate: string, context: ApiRequestContext = {}) { return apiFetch<OccupancyReport>(`/api/v1/admin/reports/occupancy?${new URLSearchParams({ start_date: startDate, end_date: endDate })}`, { cache: "no-store" }, context); }
export function getRevenueReport(startDate: string, endDate: string, context: ApiRequestContext = {}) { return apiFetch<RevenueReport>(`/api/v1/admin/reports/revenue?${new URLSearchParams({ start_date: startDate, end_date: endDate })}`, { cache: "no-store" }, context); }
export function getAdminUsers(context: ApiRequestContext = {}) { return apiFetch<AdminUser[]>("/api/v1/admin/users", { cache: "no-store" }, context); }
export function updateAdminUserRole(id: string, role: AdminUser["role"]) { return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/role`, jsonInit("PATCH", { role })); }
