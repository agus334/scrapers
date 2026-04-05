/**
 * @author      ARR Official
 * @title       SaveTube YouTube to MP4 Converter
 * @description Convert YouTube video ke MP4 otomatis menggunakan API SaveTube dengan decrypt AES
 * @baseurl     https://media.savetube.vip
 * @tags        tools
 * @language    javascript
 */

const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const YOUTUBE_URL = 'https://youtu.be/dQw4w9WgXcQ';

const KEY = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');

function decrypt(enc) {
    const b = Buffer.from(enc.replace(/\s/g, ''), 'base64');
    const iv = b.subarray(0, 16);
    const data = b.subarray(16);
    const decipher = crypto.createDecipheriv('aes-128-cbc', KEY, iv);
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString());
}

async function getRandomCdn() {
    const res = await axios.get('https://media.savetube.vip/api/random-cdn', {
        headers: {
            'Origin': 'https://save-tube.com',
            'Referer': 'https://save-tube.com/',
            'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0'
        }
    });
    return res.data.cdn;
}

async function convertToMp4(url) {
    console.log('[*] Mulai konversi YouTube ke MP4...');
    
    const cdn = await getRandomCdn();
    console.log('[+] CDN:', cdn);
    
    const infoRes = await axios.post(`https://${cdn}/v2/info`, { url }, {
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://save-tube.com',
            'Referer': 'https://save-tube.com/'
        }
    });
    
    if (!infoRes.data?.status) throw new Error('Gagal get info video');
    
    const json = decrypt(infoRes.data.data);
    const videoFormat = json.video_formats.find(f => f.quality === '360') || 
                        json.video_formats.find(f => f.quality === '720') ||
                        json.video_formats[0];
    
    const downloadRes = await axios.post(`https://${cdn}/download`, {
        id: json.id,
        key: json.key,
        downloadType: 'video',
        quality: String(videoFormat.quality)
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://save-tube.com',
            'Referer': 'https://save-tube.com/'
        }
    });
    
    return {
        title: json.title,
        downloadUrl: downloadRes.data?.data?.downloadUrl,
        quality: videoFormat.quality,
        size: videoFormat.size
    };
}

async function downloadMp4(url, filename) {
    console.log('[*] Download MP4...');
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filename, res.data);
    const sizeMB = (fs.statSync(filename).size / (1024 * 1024)).toFixed(2);
    console.log('[+] Ukuran file:', sizeMB, 'MB');
    console.log('[+] File tersimpan:', filename);
}

async function main() {
    try {
        const result = await convertToMp4(YOUTUBE_URL);
        
        if (!result.downloadUrl) throw new Error('Gagal dapat download URL');
        
        const safeTitle = (result.title || 'output').replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 50);
        const filename = safeTitle + '.mp4';
        
        await downloadMp4(result.downloadUrl, filename);
        
        console.log('\n[+] Hasil:');
        console.log(`   Judul       : ${result.title}`);
        console.log(`   Kualitas    : ${result.quality}p`);
        console.log(`   Ukuran      : ${result.size || 'Unknown'}`);
        console.log(`   Download URL: ${result.downloadUrl}`);
        console.log(`   Disimpan    : ${filename}`);
        
        console.log(result);
        console.log('[DONE] Selesai!');
    } catch (err) {
        console.error('[ERROR]', err.message);
    }
}

main();
