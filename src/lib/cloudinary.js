// Cloudinary upload helper — unsigned upload preset
const CLOUD_NAME    = 'de7haar7x';
const UPLOAD_PRESET = 'nourishmind_unsigned';

export const uploadToCloudinary = async (file, folder = 'nourishmind') => {
  const isPdf = file.type === 'application/pdf';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  // For PDFs: use image endpoint but tell Cloudinary it's a raw file
  if (isPdf) {
    formData.append('resource_type', 'raw');
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Cloudinary upload failed');
  }
  const data = await res.json();
  return data.secure_url;
};
