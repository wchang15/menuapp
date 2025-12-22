'use client';
import { useEffect, useState } from 'react';
import { KEYS, loadBlob, saveBlob } from '@/lib/storage';

export default function MenuEditor() {
  const [bg, setBg] = useState(null);

  useEffect(() => {
    loadBlob(KEYS.MENU_BG).then(setBg);
  }, []);

  const upload = async (f) => {
    await saveBlob(KEYS.MENU_BG, f);
    setBg(f);
  };

  return (
    <div style={{ width:'100vw', height:'100vh' }}>
      {!bg ? (
        <input type="file" accept="image/*" onChange={e=>upload(e.target.files[0])} />
      ) : (
        <img src={URL.createObjectURL(bg)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
      )}
    </div>
  );
}