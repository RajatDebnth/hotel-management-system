import { getPublicEnvironment } from "@/lib/env";
import type { components } from "@/lib/api-schema";

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getPublicEnvironment().apiUrl}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? `API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

type RoomFilters = {
  page?: number; pageSize?: number; query?: string; checkIn?: string; checkOut?: string;
  guests?: number; minPrice?: number; maxPrice?: number; category?: string;
};

export function getRooms({
  page = 1, pageSize = 12, query = "", checkIn, checkOut, guests,
  minPrice, maxPrice, category,
}: RoomFilters = {}) {
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

export function getRoom(slug: string) {
  return apiFetch<CatalogRoom>(`/api/v1/catalog/rooms/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
}

export function getFacilities() {
  return apiFetch<Facility[]>("/api/v1/catalog/facilities", { next: { revalidate: 60 } });
}

export function createEnquiry(payload: Record<string, string>) {
  return apiFetch<{ id: string; message: string }>("/api/v1/enquiries", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

export function createBooking(payload: BookingCreate, accessToken: string) {
  return apiFetch<Booking>("/api/v1/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

function authHeaders(accessToken: string, json = false) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export function getProfile(accessToken: string) {
  return apiFetch<Profile>("/api/v1/me", { headers: authHeaders(accessToken), cache: "no-store" });
}

export function updateProfile(payload: { full_name: string; phone: string | null }, accessToken: string) {
  return apiFetch<Profile>("/api/v1/me", {
    method: "PATCH", headers: authHeaders(accessToken, true), body: JSON.stringify(payload),
  });
}

export function getBookings(accessToken: string) {
  return apiFetch<BookingList>("/api/v1/bookings", { headers: authHeaders(accessToken), cache: "no-store" });
}

export function getBooking(reference: string, accessToken: string) {
  return apiFetch<Booking>(`/api/v1/bookings/${encodeURIComponent(reference)}`, {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}

export function cancelBooking(reference: string, reason: string, accessToken: string) {
  return apiFetch<Booking>(`/api/v1/bookings/${encodeURIComponent(reference)}/cancel`, {
    method: "POST", headers: authHeaders(accessToken, true), body: JSON.stringify({ reason }),
  });
}

export function getAdminInventory(accessToken: string) {
  return apiFetch<AdminInventory>("/api/v1/admin/inventory", {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}

export function saveAdminRecord(
  kind: "categories" | "rooms" | "facilities",
  payload: unknown,
  accessToken: string,
  id?: string,
) {
  return apiFetch<{ id: string }>(`/api/v1/admin/inventory/${kind}${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST", headers: authHeaders(accessToken, true), body: JSON.stringify(payload),
  });
}

export async function deleteAdminRecord(kind: string, id: string, accessToken: string) {
  return apiFetch<void>(`/api/v1/admin/inventory/${kind}/${id}`, {
    method: "DELETE", headers: authHeaders(accessToken),
  });
}

export function uploadAdminImage(form: FormData, accessToken: string) {
  return apiFetch<AdminInventory["images"][number]>("/api/v1/admin/inventory/images", {
    method: "POST", headers: authHeaders(accessToken), body: form,
  });
}

export function updateAdminImage(id: string, payload: { alt_text: string; sort_order: number; is_cover: boolean }, accessToken: string) {
  return apiFetch<AdminInventory["images"][number]>(`/api/v1/admin/inventory/images/${id}`, {
    method: "PATCH", headers: authHeaders(accessToken, true), body: JSON.stringify(payload),
  });
}

type OperationsFilters = { page?: number; query?: string; status?: string };

export function getAdminBookings(accessToken: string, filters: OperationsFilters = {}) {
  const params = new URLSearchParams({ page: String(filters.page ?? 1), page_size: "10" });
  if (filters.query) params.set("q", filters.query);
  if (filters.status) params.set("status", filters.status);
  return apiFetch<AdminBookingList>(`/api/v1/admin/operations/bookings?${params}`, {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}

export function updateAdminBooking(id: string, status: string, reason: string, accessToken: string) {
  return apiFetch<Booking>(`/api/v1/admin/operations/bookings/${id}/status`, {
    method: "PATCH", headers: authHeaders(accessToken, true), body: JSON.stringify({ status, reason }),
  });
}

export function getAdminEnquiries(accessToken: string, filters: OperationsFilters = {}) {
  const params = new URLSearchParams({ page: String(filters.page ?? 1), page_size: "10" });
  if (filters.query) params.set("q", filters.query);
  if (filters.status) params.set("status", filters.status);
  return apiFetch<AdminEnquiryList>(`/api/v1/admin/operations/enquiries?${params}`, {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}

export function updateAdminEnquiry(id: string, payload: { status: string; assigned_to: string | null; admin_notes: string | null }, accessToken: string) {
  return apiFetch<AdminEnquiryList["items"][number]>(`/api/v1/admin/operations/enquiries/${id}`, {
    method: "PATCH", headers: authHeaders(accessToken, true), body: JSON.stringify(payload),
  });
}

export function getAdminOptions(accessToken: string) {
  return apiFetch<AdminOption[]>("/api/v1/admin/operations/admins", {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}

export function getDashboardSummary(accessToken: string, reportDate?: string) {
  const suffix = reportDate ? `?report_date=${encodeURIComponent(reportDate)}` : "";
  return apiFetch<DashboardSummary>(`/api/v1/admin/dashboard/summary${suffix}`, {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}

export function getOccupancyReport(accessToken: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  return apiFetch<OccupancyReport>(`/api/v1/admin/reports/occupancy?${params}`, {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}

export function getRevenueReport(accessToken: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  return apiFetch<RevenueReport>(`/api/v1/admin/reports/revenue?${params}`, {
    headers: authHeaders(accessToken), cache: "no-store",
  });
}
