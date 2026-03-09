/**
 * @author      ARR Official
 * @title       F-Droid App Repository Scraper
 * @description Scraper untuk mencari aplikasi FOSS Android di F-Droid repository
 * @baseurl     https://search.f-droid.org
 * @tags        tools
 * @language    javascript
 */

const axios = require('axios');

const QUERY = 'termux';
const MAX_PAGES = 1;
const PER_PAGE = 10;
const BASE_URL = 'https://search.f-droid.org';
const FDROID_BASE = 'https://f-droid.org';

async function searchFdroid(query) {
    const results = [];

    for (let page = 0; page < MAX_PAGES; page++) {
        const offset = page * PER_PAGE;

        const response = await axios.post(
            `${BASE_URL}/indexes/apps/search`,
            {
                q: query,
                limit: PER_PAGE,
                offset: offset,
                attributesToRetrieve: [
                    'packageName', 'name', 'summary', 'description',
                    'license', 'categories', 'added', 'lastUpdated',
                    'suggestedVersionName', 'icon'
                ]
            },
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Origin': BASE_URL,
                    'Referer': `${BASE_URL}/`
                }
            }
        );

        const data = response.data;
        const hits = data?.hits ?? [];

        if (hits.length === 0) break;

        for (const hit of hits) {
            const packageName = hit?.packageName ?? hit?.id ?? '-';
            const name = hit?.name ?? '-';
            const summary = hit?.summary ?? '-';
            const rawDesc = hit?.description ?? '-';
            const description = rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 150);
            const license = hit?.license ?? '-';
            const categories = Array.isArray(hit?.categories)
                ? hit.categories.join(', ')
                : (hit?.categories ?? '-');
            const added = hit?.added
                ? new Date(hit.added).toLocaleDateString('id-ID')
                : '-';
            const updated = hit?.lastUpdated
                ? new Date(hit.lastUpdated).toLocaleDateString('id-ID')
                : '-';
            const version = hit?.suggestedVersionName ?? hit?.version ?? '-';
            const iconUrl = packageName !== '-'
                ? `${FDROID_BASE}/repo/${packageName}/en-US/icon.png`
                : '-';
            const detailUrl = packageName !== '-'
                ? `${FDROID_BASE}/en/packages/${packageName}/`
                : '-';

            results.push({
                nama: name,
                package: packageName,
                versi: version,
                ringkasan: summary,
                deskripsi: description + (description.length >= 150 ? '...' : ''),
                lisensi: license,
                kategori: categories,
                ditambahkan: added,
                diperbarui: updated,
                icon_url: iconUrl,
                url: detailUrl
            });
        }

        const total = data?.estimatedTotalHits ?? data?.nbHits ?? 0;
        if (offset + hits.length >= total) break;
    }

    return results;
}

async function searchFdroidFallback(query) {
    const results = [];

    const response = await axios.get(`${BASE_URL}/`, {
        params: { q: query, lang: 'en' },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });

    const html = response.data;

    const packageBlocks = [];
    const blockRegex = /<a[^>]+class="[^"]*package-header[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let bm;
    while ((bm = blockRegex.exec(html)) !== null) {
        packageBlocks.push({ href: bm[1], inner: bm[2] });
    }

    for (const block of packageBlocks) {
        const nameMatch = block.inner.match(/<span[^>]+class="[^"]*package-name[^"]*"[^>]*>([\s\S]*?)<\/span>/);
        const summaryMatch = block.inner.match(/<span[^>]+class="[^"]*package-summary[^"]*"[^>]*>([\s\S]*?)<\/span>/);
        const iconMatch = block.inner.match(/<img[^>]+src="([^"]+)"[^>]*>/);
        const pkgMatch = block.href.match(/\/packages\/([^\/]+)\//);

        const name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').trim() : '-';
        const summary = summaryMatch ? summaryMatch[1].replace(/<[^>]*>/g, '').trim() : '-';
        const packageName = pkgMatch ? pkgMatch[1] : '-';
        const iconUrl = iconMatch ? iconMatch[1] : '-';
        const detailUrl = block.href.startsWith('http') ? block.href : `${FDROID_BASE}${block.href}`;

        results.push({
            nama: name,
            package: packageName,
            versi: '-',
            ringkasan: summary,
            deskripsi: '-',
            lisensi: '-',
            kategori: '-',
            ditambahkan: '-',
            diperbarui: '-',
            icon_url: iconUrl,
            url: detailUrl
        });
    }

    return results;
}

async function main() {
    try {
        console.log(`[*] Mencari "${QUERY}" di F-Droid...`);

        let results = [];

        try {
            results = await searchFdroid(QUERY);
        } catch (e) {
            results = await searchFdroidFallback(QUERY);
        }

        console.log(`[+] Ditemukan ${results.length} hasil:\n`);

        results.forEach((item, index) => {
            console.log(`${index + 1}.`);
            console.log(`    Nama       : ${item.nama}`);
            console.log(`    Package    : ${item.package}`);
            console.log(`    Versi      : ${item.versi}`);
            console.log(`    Ringkasan  : ${item.ringkasan}`);
            console.log(`    Deskripsi  : ${item.deskripsi}`);
            console.log(`    Lisensi    : ${item.lisensi}`);
            console.log(`    Kategori   : ${item.kategori}`);
            console.log(`    Ditambahkan: ${item.ditambahkan}`);
            console.log(`    Diperbarui : ${item.diperbarui}`);
            console.log(`    Icon URL   : ${item.icon_url}`);
            console.log(`    URL        : ${item.url}`);
            console.log('');
        });

        console.log(results);
        console.log('[DONE] Selesai!');

    } catch (err) {
        if (err.response) {
            console.error(`[ERROR] HTTP ${err.response.status}: ${err.response.statusText}`);
            console.error(`[DEBUG] Response:`, JSON.stringify(err.response.data)?.substring(0, 300));
        } else {
            console.error(`[ERROR] ${err.message}`);
        }
        process.exit(1);
    }
}

main();
