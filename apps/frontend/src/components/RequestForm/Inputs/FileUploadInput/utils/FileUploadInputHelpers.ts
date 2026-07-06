// Extract original filename from UUID-slug (for display only)
export function extractOriginalFileName(slug: string): string {
  const repeatedUuidPrefixRegex =
    /^((?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-)+)/i;
  return slug.replace(repeatedUuidPrefixRegex, '');
}

// Convert base64 string to File (keeping the stored slug name)
export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);

  const extension = filename.split('.').pop()?.toLowerCase();
  let mime = '';

  // if we can't alter mime type when saving to DB on backend
  if (extension === 'xlsx') {
    mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (extension === 'xls') {
    mime = 'application/vnd.ms-excel';
  } else {
    const mimeMatch = arr[0].match(/:(.*?);/);
    mime = mimeMatch?.[1] || 'application/octet-stream';
  }

  return new File([u8arr], filename, { type: mime });
}
