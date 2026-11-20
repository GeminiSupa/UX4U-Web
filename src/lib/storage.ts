import "server-only";
import { admin } from "./supabase";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Uploads an image to the public "studio" bucket and returns its URL. Empty string when no file was sent. */
export async function storeImage(file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) return "";
  if (!ALLOWED.has(file.type)) throw new Error("Use a JPEG, PNG, WebP or GIF image");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type] || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const supabase = admin();
  const { error } = await supabase.storage.from("studio").upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("studio").getPublicUrl(path).data.publicUrl;
}
