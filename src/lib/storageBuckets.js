export const STORAGE_BUCKET_IMAGES = "cms_images";
export const STORAGE_BUCKET_MEDIA = "cms_media";
export const MEDIA_UPLOAD_BUCKETS = Array.from(
  new Set([STORAGE_BUCKET_MEDIA, STORAGE_BUCKET_IMAGES].filter(Boolean))
);

export const formatBucketChoices = (buckets = MEDIA_UPLOAD_BUCKETS) => {
  const items = (buckets || []).filter(Boolean);
  if (!items.length) return "";
  if (items.length === 1) return `„${items[0]}“`;
  if (items.length === 2) return `„${items[0]}“ oder „${items[1]}“`;
  return `${items.slice(0, -1).map((item) => `„${item}“`).join(", ")} oder „${items[items.length - 1]}“`;
};

export const isMissingBucketError = (error) => {
  if (!error) return false;
  const message = (error?.message || "").toLowerCase();
  return message.includes("bucket") || message.includes("not found") || message.includes("does not exist");
};
