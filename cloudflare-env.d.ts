declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ORBIT_ADMIN_USERNAME?: string;
    ORBIT_ADMIN_PASSWORD_HASH?: string;
  }
}
