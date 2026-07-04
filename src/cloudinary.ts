import { compressImage } from '@/utils/imageUtils';

type UploadResult = {
  secure_url: string;
  public_id: string;
  [key: string]: any;
};

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const DELETE_ENDPOINT = import.meta.env.VITE_CLOUDINARY_DELETE_URL as string; // optional backend endpoint for deletes

export async function uploadImageToCloudinary(file: File, folder?: string): Promise<UploadResult | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary config missing. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const form = new FormData();
  // Compress image before upload to save bandwidth and meet preset limits
  let uploadFile: Blob | File = file;
  try {
    const MAX_BYTES = 500 * 1024; // 500KB target for free Cloudinary plan
    const compressed = await compressImage(file, 1200, 0.8, MAX_BYTES);
    // If compression returned a Blob different from original, use it
    if (compressed && compressed.size && compressed.size < file.size) {
      uploadFile = new File([compressed], file.name, { type: (compressed as Blob).type || 'image/jpeg' });
    }
  } catch (e) {
    console.warn('Image compression failed, uploading original file', e);
    uploadFile = file;
  }

  form.append('file', uploadFile as Blob);
  form.append('upload_preset', UPLOAD_PRESET);
  if (folder) form.append('folder', folder);

  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    let errText = '';
    try {
      const json = await res.json();
      errText = JSON.stringify(json);
    } catch (e) {
      errText = await res.text();
    }
    throw new Error(`Cloudinary upload failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return data as UploadResult;
}

export async function deleteImage(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  if (!DELETE_ENDPOINT) {
    console.warn('No VITE_CLOUDINARY_DELETE_URL set; deletion requires a backend endpoint that calls Cloudinary admin API');
    return false;
  }
  const res = await fetch(DELETE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_id: publicId }),
  });
  return res.ok;
}

export default { uploadImageToCloudinary, deleteImage };
