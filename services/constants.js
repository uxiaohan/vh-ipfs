export const DEFAULT_GATEWAYS = [
  { name: "Cloudflare", url: "https://cloudflare-ipfs.com/ipfs" },
  { name: "IPFS官方", url: "https://ipfs.io/ipfs" },
  { name: "Protocol Labs", url: "https://dweb.link/ipfs" },
  { name: "Pinata", url: "https://gateway.pinata.cloud/ipfs" }
];

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_LOCAL_FRACTION = 0.5;

export const ERROR_CODES = {
  INVALID_PASSWORD: "invalid_password",
  PASSWORD_NOT_SET: "password_not_set",
  FILE_REQUIRED: "file_required",
  ONLY_IMAGE_OR_VIDEO: "only_image_or_video",
  STORAGE_LIMIT_EXCEEDED: "storage_limit_exceeded"
};