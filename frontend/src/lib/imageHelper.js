/**
 * Converts Google Drive share links to direct display URLs
 * 
 * E.g. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * to https://lh3.googleusercontent.com/d/FILE_ID
 */
export function getDirectImageUrl(url) {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  
  return url;
}
