export const DEFAULT_GATEWAYS = [
  { name: "Cloudflare", url: "https://cloudflare-ipfs.com/ipfs" },
  { name: "IPFS官方", url: "https://ipfs.io/ipfs" },
  { name: "Protocol Labs", url: "https://dweb.link/ipfs" },
  { name: "Pinata", url: "https://gateway.pinata.cloud/ipfs" }
];

export const MAX_LOCAL_FRACTION = 0.5;

export const ERROR_CODES = {
  INVALID_PASSWORD: "invalid_password",
  PASSWORD_NOT_SET: "password_not_set",
  FILE_REQUIRED: "file_required",
  STORAGE_LIMIT_EXCEEDED: "storage_limit_exceeded"
};