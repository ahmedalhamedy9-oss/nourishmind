// Cloudinary upload helper — unsigned upload preset
const CLOUD_NAME    = 'de7haar7x';
const UPLOAD_PRESET = 'nourishmind_unsigned';

export const uploadToCloudinary = async (file, folder = 'nourishmind') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
};
