const DELETE_ENDPOINT = import.meta.env.VITE_CLOUDINARY_DELETE_URL as string;

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

export default { deleteImage };
