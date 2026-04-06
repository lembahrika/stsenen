const fs = require('fs');
const path = require('path');

// 1. Konfigurasi API Cloudflare (Diambil dari Environment Variables yang Anda isi tadi)
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_NAMESPACE_ID = process.env.CF_NAMESPACE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

async function buildBlog() {
    console.log("Menghubungkan ke KV Storage...");

    try {
        // 2. Ambil daftar kunci (list keys) dari KV
        const listUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/keys`;
        
        const response = await fetch(listUrl, {
            headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error("Gagal mengambil data dari KV: " + JSON.stringify(data.errors));
        }

        const keys = data.result;
        console.log(`Ditemukan ${keys.length} artikel.`);

        // 3. Pastikan folder blog tersedia
        if (!fs.existsSync('./blog')) {
            fs.mkdirSync('./blog');
        }

        // 4. Baca Template HTML
        const templatePath = path.join(__dirname, 'blog-post-template.html');
        if (!fs.existsSync(templatePath)) {
            throw new Error("File 'blog-post-template.html' tidak ditemukan di GitHub!");
        }
        let template = fs.readFileSync(templatePath, 'utf8');

        // 5. Loop setiap artikel dan buat file HTML-nya
        for (const keyObj of keys) {
            const slug = keyObj.name; // Contoh: 'jadwal-kereta-api'
            
            // Ambil isi konten berdasarkan kunci
            const getValUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/values/${slug}`;
            const valRes = await fetch(getValUrl, {
                headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
            });
            const content = await valRes.json();

            // Masukkan data ke template
            let html = template
                .replace(/{{TITLE}}/g, content.title)
                .replace(/{{CONTENT}}/g, content.body)
                .replace(/{{DATE}}/g, content.date || new Date().toLocaleDateString())
                .replace(/{{IMAGE}}/g, content.image || 'https://via.placeholder.com/800x400');

            // Simpan jadi file .html
            fs.writeFileSync(`./blog/${slug}.html`, html);
            console.log(`✅ Berhasil mencetak: /blog/${slug}.html`);
        }

        console.log("Proses Build Selesai!");

    } catch (error) {
        console.error("EROR SAAT BUILD:", error.message);
        process.exit(1); // Memberitahu Cloudflare bahwa build gagal
    }
}

buildBlog();