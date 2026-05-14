import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: 'dlg93i1wn',
  api_key: '972342177747165',
  api_secret: 'bb-x1jpHVF1hwtjp9QOaplRUZG8',
});

const HERBS_DIR = path.resolve('Ayurvedic herbs/Ayurvedic herbs');
const OUTPUT_FILE = path.resolve('lib/herb-images.json');

async function uploadAll() {
  const herbs = fs.readdirSync(HERBS_DIR).filter(f =>
    fs.statSync(path.join(HERBS_DIR, f)).isDirectory()
  );

  console.log(`Found ${herbs.length} herb folders. Starting upload...\n`);
  const results = {};

  for (const herb of herbs) {
    const herbDir = path.join(HERBS_DIR, herb);
    const images = fs.readdirSync(herbDir).filter(f =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    if (images.length === 0) {
      console.log(`⏭  ${herb}: no images found, skipping`);
      continue;
    }

    results[herb.toLowerCase()] = [];
    
    for (const img of images) {
      const filePath = path.join(herbDir, img);
      try {
        console.log(`📤 Uploading ${herb}/${img}...`);
        const res = await cloudinary.uploader.upload(filePath, {
          folder: `vaidya/herbs/${herb.toLowerCase()}`,
          public_id: path.parse(img).name,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good', fetch_format: 'auto' }
          ]
        });
        results[herb.toLowerCase()].push(res.secure_url);
        console.log(`   ✅ ${res.secure_url}`);
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }
  }

  // Write results to JSON
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n🎉 Done! ${Object.keys(results).length} herbs uploaded.`);
  console.log(`📁 URLs saved to ${OUTPUT_FILE}`);
}

uploadAll().catch(console.error);
