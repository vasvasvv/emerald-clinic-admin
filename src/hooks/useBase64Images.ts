import { useEffect, useState } from 'react';

import url1 from '@/assets/target001.png?url';
import url2 from '@/assets/target002.png?url';
import url3 from '@/assets/target003.png?url';
import url4 from '@/assets/target004.png?url';
import url5 from '@/assets/target005.png?url';
import url6 from '@/assets/target006.png?url';

const IMAGE_URLS = [url1, url2, url3, url4, url5, url6];

async function toBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

let cachedImages: string[] | null = null;

export function useBase64Images() {
  const [images, setImages] = useState<string[] | null>(cachedImages);

  useEffect(() => {
    if (cachedImages) return;

    void Promise.all(IMAGE_URLS.map(toBase64)).then((result) => {
      cachedImages = result;
      setImages(result);
    });
  }, []);

  return images;
}
