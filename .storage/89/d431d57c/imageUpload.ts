// ImgBB API for free image hosting
const IMGBB_API_KEY = 'd2e9f8c1e8f9c8d2e9f8c1e8f9c8d2e9'; // Public API key

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
      console.error('ImgBB upload failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.url) {
      return data.data.url;
    }
    
    return null;
  } catch (error) {
    console.error('Error uploading image to ImgBB:', error);
    return null;
  }
}

export async function uploadMultipleImages(base64Images: string[]): Promise<string[]> {
  if (!base64Images || base64Images.length === 0) {
    return [];
  }
  
  try {
    const uploadPromises = base64Images.map(img => uploadImageToImgBB(img));
    const results = await Promise.allSettled(uploadPromises);
    
    const successfulUrls: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulUrls.push(result.value);
      } else {
        console.error(`Failed to upload image ${index + 1}`);
      }
    });
    
    return successfulUrls;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    return [];
  }
}