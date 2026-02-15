import { auth, db, supabase, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// STATE GLOBAL
let allProducts = [];

// --- 1. INISIALISASI & PROTEKSI ROLE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Tampilkan Info User di Navbar
        document.getElementById('navUsername').innerText = user.displayName || "User";
        document.getElementById('userAvatar').src = user.photoURL || "https://via.placeholder.com/40";
        
        try {
            // Tarik data role dari Firestore secara akurat
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);

            if (snap.exists()) {
                const userData = snap.data();
                const role = userData.role; // Wajib 'OWNER', 'MANAGER', atau 'WORKER'
                
                // Update teks role di navbar
                document.getElementById('userRole').innerText = role;

                // Tampilkan tombol panel rahasia HANYA jika role cocok
                renderAdminArea(role);
            }
            
            // Lanjut load data konten dari Supabase
            await loadNavCategories();
            await loadProducts();

        } catch (error) {
            console.error("Gagal memproses data role:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// --- 2. RENDER AREA PANEL KHUSUS ---
function renderAdminArea(role) {
    const area = document.getElementById('admin-menu-area');
    if (!area) return;

    let html = '';
    // Panel muncul otomatis jika role sesuai
    if (role === 'OWNER') {
        html = `
            <div class="p-4 glass rounded-3xl border border-yellow-500/30 bg-yellow-500/5 flex justify-between items-center mb-6">
                <div class="text-left">
                    <p class="text-[9px] text-yellow-500 font-black uppercase tracking-widest">Master Access</p>
                    <h4 class="text-xs font-bold text-white">Owner Control Panel</h4>
                </div>
                <button onclick="window.location.href='ownerpanel.html'" class="bg-yellow-600 px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-yellow-900/20 active:scale-95 transition-all">BUKA PANEL</button>
            </div>`;
    } else if (role === 'MANAGER') {
        html = `
            <div class="p-4 glass rounded-3xl border border-cyan-500/30 bg-cyan-500/5 flex justify-between items-center mb-6">
                <div class="text-left">
                    <p class="text-[9px] text-cyan-500 font-black uppercase tracking-widest">Operation Access</p>
                    <h4 class="text-xs font-bold text-white">Manager System</h4>
                </div>
                <button onclick="window.location.href='managerpanel.html'" class="bg-cyan-600 px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-cyan-900/20 active:scale-95 transition-all">BUKA PANEL</button>
            </div>`;
    }
    area.innerHTML = html;
}

// --- 3. LOAD KATEGORI DINAMIS (DARI OWNER) ---
async function loadNavCategories() {
    const nav = document.getElementById('nav-categories');
    // Tarik kategori dari tabel 'categories'
    const { data: cats, error } = await supabase.from('categories').select('*').order('name');

    if (error) {
        console.error("Error load kategori:", error.message);
        return;
    }

    let html = `
        <button onclick="filterService('all')" class="cat-btn active px-6 py-2.5 rounded-2xl text-[10px] font-black border border-gray-800 transition-all whitespace-nowrap bg-[#1a1a1a]/50">
            SEMUA
        </button>
    `;

    cats.forEach(c => {
        html += `
            <button onclick="filterService('${c.slug}')" class="cat-btn bg-[#1a1a1a]/50 border border-gray-800 px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap flex items-center gap-3 hover:border-blue-500/50 hover:bg-blue-600/10 transition-all text-gray-400">
                <img src="${c.logo_url}" class="w-4 h-4 object-contain">
                <span>${c.name.toUpperCase()}</span>
            </button>`;
    });

    nav.innerHTML = html;
}

// --- 4. LOAD & RENDER PRODUK ---
async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error) {
        allProducts = data;
        renderProducts(data);
    }
}

function renderProducts(data) {
    const container = document.getElementById('product-container');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-600 py-10 italic">Belum ada layanan tersedia.</p>`;
        return;
    }

    container.innerHTML = data.map(p => {
        const thumb = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300x200';
        return `
            <div class="glass rounded-[2rem] overflow-hidden border border-gray-800/50 hover:border-blue-500/50 transition-all duration-500 group flex flex-col h-full cursor-pointer" 
                 onclick="window.location.href='product-detail.html?id=${p.id}'">
                <div class="h-40 w-full bg-cover bg-center transition-transform group-hover:scale-105 duration-700" style="background-image: url('${thumb}')"></div>
                <div class="p-5 flex-1 flex flex-col">
                    <span class="text-[8px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg font-black uppercase w-fit mb-2 border border-blue-500/20">${p.category_slug || 'Service'}</span>
                    <h3 class="font-bold text-sm text-white truncate mb-1">${p.name}</h3>
                    <p class="text-green-400 font-mono font-bold text-xs mt-1">${formatRupiah(p.price)}</p>
                    <button class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20">BELI SEKARANG</button>
                </div>
            </div>`;
    }).join('');
}

// --- 5. LOGIKA FILTERING ---
window.filterService = (slug) => {
    // UI Update Tombol Aktif
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600/20', 'border-blue-500/50', 'text-white');
        btn.classList.add('text-gray-400');
    });
    event.currentTarget.classList.add('active', 'border-blue-500/50', 'text-white');

    // Filter Data Lokal
    const filtered = slug === 'all' ? allProducts : allProducts.filter(p => p.category_slug === slug);
    renderProducts(filtered);
};
