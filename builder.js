const fs = require('fs');
const path = require('path');

// Ambil variabel dari Environment Cloudflare
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_NAMESPACE_ID = process.env.CF_NAMESPACE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

async function buildBlog() {
    console.log("🚀 Memulai Build...");

    try {
        // Gunakan process.cwd() agar jalur file lebih akurat di server Cloudflare
        const rootPath = process.cwd();
        const templatePath = path.join(rootPath, 'blog-post-template.html');

        console.log("📍 Mencari template di:", templatePath);

        if (!fs.existsSync(templatePath)) {
            // Jika gagal lagi, tampilkan isi folder untuk diagnosa
            const files = fs.readdirSync(rootPath);
            console.log("📁 Isi folder root saat ini:", files);
            throw new Error("File 'blog-post-template.html' masih belum terbaca!");
        }

        const template = fs.readFileSync(templatePath, 'utf8');

        // Ambil data dari KV
        const listUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/keys`;
        const response = await fetch(listUrl, {
            headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
        });
        const data = await response.json();

        if (!data.success) throw new Error("Gagal akses KV: " + JSON.stringify(data.errors));

        const keys = data.result;
        console.log(`📂 Ditemukan ${keys.length} artikel.`);

        // Jika 0 artikel, kita buat folder blog kosong agar tidak error
        if (!fs.existsSync('./blog')) fs.mkdirSync('./blog');

        for (const keyObj of keys) {
            const slug = keyObj.name;
            const getValUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/values/${slug}`;
            const valRes = await fetch(getValUrl, {
                headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
            });
            
            const content = await valRes.json();

            // Replace menggunakan huruf kecil sesuai template Anda
            let html = template
                .replace(/{{title}}/g, content.title || '')
                .replace(/{{content}}/g, content.body || content.content || '')
                .replace(/{{date}}/g, content.date || new Date().toLocaleDateString('id-ID'))
                .replace(/{{category}}/g, content.category || 'Berita');

            fs.writeFileSync(`./blog/${slug}.html`, html);
            console.log(`✅ Berhasil: /blog/${slug}.html`);
        }

        console.log("✨ Build Selesai!");
    } catch (error) {
        console.error("❌ ERROR:", error.message);
        process.exit(1);
    }
}

buildBlog();
