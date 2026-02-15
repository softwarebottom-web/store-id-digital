import { auth, db, supabase, formatRupiah } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- STATE MANAGEMENT ---
let allProducts = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. Ambil Nama & Avatar
        document.getElementById('navUsername').innerText = user.displayName || "User";
        
        try {
            // 2. PROTEKSI ROLE: Ambil data role dari Firestore
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);

            if (snap.exists()) {
                const userData = snap.data();
                const role = userData.role; // Pastikan di database tulisannya 'OWNER', 'MANAGER', atau 'WORKER'
                
                // Update teks role di navbar
                document.getElementById('userRole').innerText = role;

                // Tampilkan tombol panel khusus berdasarkan role
                renderSpecialMenu(role);
            }
            
            // 3. Load Data Konten
            await loadNavCategories();
            await loadProducts();

        } catch (error) {
            console.error("Gagal memproses data role:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// FUNGSI RENDER MENU KHUSUS (Owner/Worker/Manager)
function renderSpecialMenu(role) {
    const area = document.getElementById('admin-menu-area');
    if (!area) return;

    let html = '';
    
    // Gunakan switch case agar lebih rapi
    switch (role) {
        case 'OWNER':
            html = `
                <div class="p-4 glass rounded-3xl border border-yellow-500/30 bg-yellow-500/5 flex justify-between items-center">
                    <div>
                        <p class="text-[9px] text-yellow-500 font-black uppercase tracking-widest">Admin Access</p>
                        <h4 class="text-xs font-bold text-white">Owner Control Panel</h4>
                    </div>
                    <button onclick="window.location.href='ownerpanel.html'" class="bg-yellow-600 px-4 py-2 rounded-xl text-[10px] font-black shadow-lg">BUKA PANEL</button>
                </div>`;
            break;
        case 'MANAGER':
            html = `
                <div class="p-4 glass rounded-3xl border border-cyan-500/30 bg-cyan-500/5 flex justify-between items-center">
                    <div>
                        <p class="text-[9px] text-cyan-500 font-black uppercase tracking-widest">Staf Access</p>
                        <h4 class="text-xs font-bold text-white">Manager Operation</h4>
                    </div>
                    <button onclick="window.location.href='managerpanel.html'" class="bg-cyan-600 px-4 py-2 rounded-xl text-[10px] font-black shadow-lg">BUKA PANEL</button>
                </div>`;
            break;
        case 'WORKER':
            html = `
                <div class="p-4 glass rounded-3xl border border-blue-500/30 bg-blue-500/5 flex justify-between items-center">
                    <div>
                        <p class="text-[9px] text-blue-500 font-black uppercase tracking-widest">Team Access</p>
                        <h4 class="text-xs font-bold text-white">Worker Workspace</h4>
                    </div>
                    <button onclick="window.location.href='workerpanel.html'" class="bg-blue-600 px-4 py-2 rounded-xl text-[10px] font-black shadow-lg">BUKA PANEL</button>
                </div>`;
            break;
    }
    
    area.innerHTML = html;
}

// FUNGSI LOAD KATEGORI DINAMIS
async function loadNavCategories() {
    const nav = document.getElementById('nav-categories');
    const { data: cats, error } = await supabase.from('categories').select('*').order('name');

    if (!error && cats) {
        let html = `<button onclick="filterService('all')" class="cat-btn active">Semua</button>`;
        cats.forEach(c => {
            html += `
                <button onclick="filterService('${c.slug}')" class="cat-btn flex items-center gap-2">
                    <img src="${c.logo_url}" class="w-4 h-4 object-contain">
                    <span>${c.name}</span>
                </button>`;
        });
        nav.innerHTML = html;
    }
}

// FUNGSI LOAD PRODUK
async function loadProducts() {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error) {
        allProducts = data;
        renderProducts(data);
    }
}

function renderProducts(data) {
    const container = document.getElementById('product-container');
    container.innerHTML = data.map(p => `
        <div class="glass rounded-3xl overflow-hidden border border-gray-800 product-card">
            <img src="${p.images[0]}" class="h-40 w-full object-cover">
            <div class="p-5">
                <h3 class="font-bold text-white">${p.name}</h3>
                <p class="text-green-400 font-bold">${formatRupiah(p.price)}</p>
                <button onclick="buyNow('${p.id}')" class="w-full mt-4 bg-blue-600 py-3 rounded-2xl text-[10px] font-black uppercase">Beli Sekarang</button>
            </div>
        </div>
    `).join('');
}
