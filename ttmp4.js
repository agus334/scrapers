/**
 * @author      ARR Official
 * @title       TikTok Video Downloader (No Watermark)
 * @description Download video TikTok tanpa watermark dari KOL.ID
 * @baseurl     https://kol.id
 * @tags        tools, scraper, downloader, tiktok
 * @language    javascript
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const qs = require('querystring');

const MODE = 'search';
const QUERY = 'https://vt.tiktok.com/ZSHDVuapU';
const DOWNLOAD_URL = '';
const OUTPUT_DIR = './downloads';

async function getCsrfToken(html) {
    const tokenMatch = /name="_token"\s+value="([^"]+)"/i.exec(html);
    if (tokenMatch) return tokenMatch[1];
    
    const tokenMatch2 = /_token["']?\s*:\s*["']([^"']+)["']/i.exec(html);
    if (tokenMatch2) return tokenMatch2[1];
    
    return null;
}

async function searchItems(tiktokUrl) {
    console.log(`[*] Mencari TikTok video dari: ${tiktokUrl}`);
    
    try {
        const mainPage = await axios.get('https://kol.id/download-video/tiktok', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
            }
        });
        
        const csrfToken = await getCsrfToken(mainPage.data);
        console.log(`[*] CSRF Token: ${csrfToken}`);
        
        const formData = {
            url: tiktokUrl,
            _token: csrfToken,
            _method: 'POST'
        };
        
        const response = await axios.post('https://kol.id/download-video/tiktok', qs.stringify(formData), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': 'https://kol.id/download-video/tiktok',
                'Origin': 'https://kol.id',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const html = response.data.html || response.data;
        
        const downloadUrlMatch = /<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?Download\s*Video<\/a>/i.exec(html);
        let videoUrl = null;
        
        if (downloadUrlMatch) {
            videoUrl = downloadUrlMatch[1];
        } else {
            const mp4Match = /(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i.exec(html);
            if (mp4Match) videoUrl = mp4Match[1];
        }
        
        const titleMatch = /<h[23][^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h[23]>/i.exec(html);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'TikTok Video';
        
        const authorMatch = /<[^>]*class="[^"]*author[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/i.exec(html);
        const author = authorMatch ? authorMatch[1].replace(/<[^>]*>/g, '').trim() : 'Unknown';
        
        if (videoUrl) {
            console.log(`[+] Ditemukan 1 hasil:`);
            console.log(`1. Nama: ${title}`);
            console.log(`     Author: ${author}`);
            console.log(`     Link: ${tiktokUrl}`);
            console.log(`     Download: ${videoUrl}`);
            
            console.log([{
                name: title,
                author: author,
                link: tiktokUrl,
                download: videoUrl
            }]);
            
            console.log(`[*] Memulai download otomatis...`);
            const filename = `${title.replace(/[^\w\s]/gi, '').substring(0, 50)}.mp4`;
            await downloadFile(videoUrl, path.join(OUTPUT_DIR, filename));
        } else {
            console.log(`[+] Ditemukan 0 hasil`);
            console.log(`[*] Tidak dapat menemukan URL download video`);
        }
        
        console.log('[DONE] Selesai!');
        return videoUrl ? [{ name: title, author: author, link: tiktokUrl, download: videoUrl }] : [];
        
    } catch (error) {
        console.error(`[-] Error: ${error.message}`);
        if (error.response) {
            console.error(`[-] Status: ${error.response.status}`);
        }
        console.log('[DONE] Selesai!');
        return [];
    }
}

async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        const fileStream = fs.createWriteStream(outputPath);
        const protocol = url.startsWith('https') ? https : http;
        
        console.log(`[*] Menyimpan ke: ${outputPath}`);
        
        const request = protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                if (response.headers.location) {
                    downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
                    return;
                }
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            let lastPercent = -1;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (totalSize) {
                    const percent = Math.floor((downloadedSize / totalSize) * 100);
                    if (percent !== lastPercent) {
                        lastPercent = percent;
                        process.stdout.write(`\r[↓] Download: ${percent}%`);
                    }
                } else {
                    const kb = Math.floor(downloadedSize / 1024);
                    process.stdout.write(`\r[↓] Download: ${kb} KB`);
                }
            });
            
            response.pipe(fileStream);
            
            fileStream.on('finish', () => {
                fileStream.close();
                const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
                console.log(`\n[+] Selesai! File tersimpan di: ${outputPath}`);
                console.log(`[*] Ukuran file: ${sizeMB} MB`);
                resolve(outputPath);
            });
            
            fileStream.on('error', (err) => {
                fs.unlink(outputPath, () => {});
                reject(err);
            });
        });
        
        request.on('error', (err) => {
            fs.unlink(outputPath, () => {});
            reject(err);
        });
        
        request.setTimeout(60000, () => {
            request.destroy();
            fs.unlink(outputPath, () => {});
            reject(new Error('Download timeout'));
        });
    });
}

async function main() {
    if (MODE === 'search') {
        await searchItems(QUERY);
    } else if (MODE === 'download') {
        if (!DOWNLOAD_URL) {
            console.error('[-] Error: DOWNLOAD_URL tidak boleh kosong untuk mode download');
            console.log('[DONE] Selesai!');
            return;
        }
        
        console.log(`[*] Memulai download dari: ${DOWNLOAD_URL}`);
        console.log('[*] Mengambil link download dari halaman...');
        
        try {
            const response = await axios.get(DOWNLOAD_URL, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9'
                },
                timeout: 15000
            });
            
            const downloadUrl = await extractDownloadLink(response.data);
            
            if (!downloadUrl) {
                console.error('[-] Error: Tidak dapat menemukan link download video');
                console.log('[DONE] Selesai!');
                return;
            }
            
            console.log(`[+] Link download ditemukan: ${downloadUrl}`);
            
            let filename = 'tiktok_video.mp4';
            const urlMatch = downloadUrl.match(/\/([^\/?#]+\.mp4)($|\?)/i);
            if (urlMatch && urlMatch[1]) {
                filename = decodeURIComponent(urlMatch[1]);
            }
            
            await downloadFile(downloadUrl, path.join(OUTPUT_DIR, filename));
        } catch (error) {
            console.error(`[-] Error: ${error.message}`);
            if (error.response) {
                console.error(`[-] Status HTTP: ${error.response.status}`);
            }
        }
        
        console.log('[DONE] Selesai!');
    } else {
        console.error('[-] Error: MODE harus "search" atau "download"');
        console.log('[DONE] Selesai!');
    }
}

async function extractDownloadLink(html) {
    const downloadRegex = /<a[^>]*href="([^"]+)"[^>]*>Download\s*Video<\/a>/i;
    let match = downloadRegex.exec(html);
    if (match && match[1]) return match[1];
    
    const mp4Regex = /(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i;
    match = mp4Regex.exec(html);
    if (match && match[1]) return match[1];
    
    return null;
}

if (require.main === module) {
    main();
}
