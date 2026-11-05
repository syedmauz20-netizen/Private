declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AUTH_ORIGIN?: string;
    AUTH_SETUP_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
