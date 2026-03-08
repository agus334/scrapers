/**
 * @author      ARR Official
 * @title       MP3Cow YouTube to MP3 Converter
 * @description Convert YouTube video ke MP3 otomatis menggunakan MP3Cow API
 * @baseurl     https://mp3cow.com
 * @tags        tools
 * @language    javascript
 */

const axios = require('axios');
const fs = require('fs');

const YOUTUBE_URL = 'https://youtu.be/4ywS4E5NmIk?si=3Pk5Adn27QOljitP';

function extractVideoId(url) {
  const regex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|youtube.com\/shorts\/)([^#\&\?]*).*/;
  const match = url.match(regex);
  return match && match[2].length === 11 ? match[2] : null;
}

async function pollConversion(videoId) {
  console.log('[*] Mulai konversi video ID:', videoId);
  while (true) {
    const res = await axios.get(`https://api.mp3cow.com/z.php?id=${videoId}&t=${Date.now()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://mp3cow.com/',
        'Origin': 'https://mp3cow.com',
      }
    });

    const obj = res.data;
    console.log('[*] Status:', obj.status, obj.message || '');

    if (obj.status === '0') {
      console.error('[!] Error:', obj.message);
      return null;
    }

    if (obj.status === '1') {
      return obj;
    }

    if (obj.status === 'c') {
      console.log('[+] Redirect ke:', obj.url);
      return null;
    }

    await new Promise(r => setTimeout(r, 5000));
  }
}

async function downloadMp3(url, filename) {
  console.log('[*] Download MP3...');
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://mp3cow.com/',
    }
  });
  fs.writeFileSync(filename, res.data);
  console.log('[+] File tersimpan:', filename);
}

async function main() {
  try {
    const videoId = extractVideoId(YOUTUBE_URL);
    if (!videoId) {
      console.error('[!] URL YouTube tidak valid');
      return;
    }

    console.log('[+] Video ID:', videoId);
    const data = await pollConversion(videoId);

    if (!data) return;

    const safeTitle = (data.title || 'output').replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 50);
    const filename = safeTitle + '.mp3';

    await downloadMp3(data.download, filename);

    const result = {
      videoId,
      title: data.title,
      downloadUrl: data.download,
      savedAs: filename
    };

    console.log('\n[+] Hasil:');
    console.log(`   Video ID    : ${result.videoId}`);
    console.log(`   Judul       : ${result.title}`);
    console.log(`   Download URL: ${result.downloadUrl}`);
    console.log(`   Disimpan    : ${result.savedAs}`);

    console.log(result);
    console.log('[DONE] Selesai!');
  } catch (err) {
    console.error('[ERROR]', err.message);
    if (err.response) {
      console.error('[HTTP]', err.response.status);
      console.error('[Body]', JSON.stringify(err.response.data).substring(0, 300));
    }
  }
}

main();
