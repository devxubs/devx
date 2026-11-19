// Client helper for the Phase 5 image-storage route (POST
// /api/uploads). Sends one file and resolves with its stored URL
// ("/uploads/<file>"); throws an Error carrying the server's message
// on any failure so forms can surface it instead of silently falling
// back to a data-URL.

export async function uploadImageFile(file: File): Promise<string> {
   const formData = new FormData();
   formData.append("file", file);
   const res = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
   });
   const data = await res.json().catch(() => ({}));
   if (!res.ok || !data.url) {
      throw new Error(data.error || "Image upload failed. Please try again.");
   }
   return data.url as string;
}
