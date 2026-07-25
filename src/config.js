// App configuration — single outward source of truth for external endpoints.
export const BASE_URL = "http://192.168.0.88";

// Image gallery API (MiniStack). POST multipart/form-data, field: `Image_File`.
export const IMAGE_API_URL = `${BASE_URL}/Ministack/Birthday/API/image.php`;

// Generated covers can be several MB at high export scales — give the upload room.
export const UPLOAD_TIMEOUT_MS = 120000;
