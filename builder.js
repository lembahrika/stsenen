const fs = require('fs');
const path = require('path');

// 1. Konfigurasi API Cloudflare
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_NAMESPACE_ID = process.env.CF_NAMESPACE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

async function buildBlog() {
    console.log("🚀 Memulai proses build blog...");

    try {
        // 2. Ambil daftar kunci dari KV
        const listUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/keys`;
        
        const response = await fetch(listUrl, {
            headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error("Gagal mengambil data dari KV: " + JSON.stringify(data.errors));
        }

        const keys = data.result;
        console.log(`📂 Ditemukan ${keys.length} artikel di KV Storage.`);

        // 3. Pastikan folder blog tersedia di root
        if (!fs.existsSync('./blog')) {
            fs.mkdirSync('./blog');
        }

        // 4. Baca Template HTML (Pastikan file ini ada di root GitHub, bukan di dalam folder blog)
        const templatePath = path.join(__dirname, 'blog-post-template.html');
        
        if (!fs.existsSync(templatePath)) {
            throw new Error("❌ File 'blog-post-template.html' tidak ditemukan di root GitHub!");
        }
        
        let template = fs.readFileSync(templatePath, 'utf8');

        // 5. Loop setiap artikel dan buat file HTML-nya
        for (const keyObj of keys) {
            const slug = keyObj.name;
            
            // Ambil konten detail dari KV
            const getValUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/values/${slug}`;
            const valRes = await fetch(getValUrl, {
                headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
            });
            
            const content = await valRes.json();

            // 6. Proses Replace (Menggunakan huruf kecil sesuai template Anda)
            let html = template
                .replace(/{{title}}/g, content.title || 'Tanpa Judul')
                .replace(/{{content}}/g, content.body || content.content || '')
                .replace(/{{date}}/g, content.date || new Date().toLocaleDateString('id-ID'))
                .replace(/{{category}}/g, content.category || 'Umum');

            // 7. Simpan file ke folder /blog/
            const fileName = slug.endsWith('.html') ? slug : `${slug}.html`;
            fs.writeFileSync(`./blog/${fileName}`, html);
            
            console.log(`✅ Berhasil mencetak: /blog/${fileName}`);
        }

        console.log("✨ Semua proses selesai! Website siap dipublikasikan.");

    } catch (error) {
        console.error("❌ EROR SAAT BUILD:", error.message);
        process.exit(1); 
    }
}

buildBlog();
