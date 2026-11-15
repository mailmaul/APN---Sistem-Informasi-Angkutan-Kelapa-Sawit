import "server-only";
import path from "node:path";

// Direktori berkas unggahan (foto slip & kendala). Sengaja DI LUAR public/:
// berkas dilayani lewat /api/uploads/... yang dijaga sesi login.

export function direktoriUnggahan(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}
