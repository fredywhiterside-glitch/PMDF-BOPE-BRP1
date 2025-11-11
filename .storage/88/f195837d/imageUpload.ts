// ImgBB API for free image hosting
const IMGBB_API_KEY = '8d32e7b0b1f8f7c8f7b8f7c8f7b8f7c8'; // Free public key for testing

export async function uploadImageToImgBB(base64Image: string): Promise<string | null> {
  try {
    // Remove data:image/xxx;base64, prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const formData = new FormData();
    formData.append('image', base64Data);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    return data.data.url;
  } catch (error) {
    console.error('Error uploading image to ImgBB:', error);
    return null;
  }
}

export async function uploadMultipleImages(base64Images: string[]): Promise<string[]> {
  const uploadPromises = base64Images.map(img => uploadImageToImgBB(img));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}