import { auth, db, supabase, formatRupiah } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let allProducts = [];

// 1. SECURITY GUARD & ROLE REDIRECT
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Ambil data user dari Firestore secara akurat
            const userSnap = await getDoc(doc(db, "users", user.uid));
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const role = userData.role;

                // Render UI berdasarkan Role
                renderRoleMenu(role);
                
                // Init data dashboard
                loadNavCategories();
                loadProducts();
            } else {
                console.error("Data user tidak ditemukan di Firestore!");
                // Jika user login tapi data Firestore gak ada, lempar ke profile buat lengkapi data
            }
        } catch (error) {
            console.error("Gagal verifikasi role:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// 2. RENDER MENU BERDASARKAN ROLE (Agar panel rahasia muncul/hilang)
function renderRoleMenu(role) {
    const adminMenu = document.getElementById('admin-menu-area'); // Area di sidebar/navbar dashboard
    if (!adminMenu) return;

    let menuHtml = '';

    if (role === "OWNER") {
        menuHtml = `
            <div class="mt-4 p-4 glass rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
                <p class="text-[9px] text-yellow-500 font-black uppercase tracking-widest mb-2">Owner Access</p>
                <button onclick="window.location.href='ownerpanel.html'" class="w-full bg-yellow-600 text-white py-2 rounded-xl text-[10px] font-bold shadow-lg">BUKA OWNER PANEL</button>
            </div>`;
    } else if (role === "MANAGER") {
        menuHtml = `
            <div class="mt-4 p-4 glass rounded-2xl border border-cyan-500/30 bg-cyan-500/5">
                <p class="text-[9px] text-cyan-500 font-black uppercase tracking-widest mb-2">Manager Access</p>
                <button onclick="window.location.href='managerpanel.html'" class="w-full bg-cyan-600 text-white py-2 rounded-xl text-[10px] font-bold">BUKA MANAGER PANEL</button>
            </div>`;
    } else if (role === "WORKER") {
        menuHtml = `
            <div class="mt-4 p-4 glass rounded-2xl border border-blue-500/30 bg-blue-500/5">
                <p class="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-2">Worker Access</p>
                <button onclick="window.location.href='workerpanel.html'" class="w-full bg-blue-600 text-white py-2 rounded-xl text-[10px] font-bold">BUKA WORKER PANEL</button>
            </div>`;
    }

    adminMenu.innerHTML = menuHtml;
}

// 3. LOAD KATEGORI DARI SUPABASE (DINAMIS)
async function loadNavCategories() {
    const nav = document.getElementById('nav-categories');
    const { data: cats, error } = await supabase.from('categories').select('*').order('name');
    
    if (error) return console.error(error);

    let html = `<button onclick="filterService('all')" class="cat-btn active px-6 py-2 rounded-full text-xs font-bold border border-gray-800 transition-all whitespace-nowrap">Semua</button>`;
    
    cats.forEach(c => {
        html += `
            <button onclick="filterService('${c.slug}')" class="cat-btn bg-[#1a1a1a] border border-gray-800 px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-2 hover:border-blue-500 transition-all text-gray-400">
                <img src="${c.logo_url}" class="w-4 h-4 object-contain">
                <span>${c.name}</span>
            </button>`;
    });
    nav.innerHTML = html;
}

// 4. LOAD PRODUK DARI SUPABASE
async function loadProducts() {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error) {
        allProducts = data;
        renderProducts(data);
    }
}

function renderProducts(data) {
    const container = document.getElementById('product-container');
    if (!container) return;

    container.innerHTML = data.map(p => `
        <div class="glass rounded-3xl overflow-hidden border border-gray-800 hover:border-blue-500 transition-all group">
            <div class="h-44 bg-cover bg-center transition-transform group-hover:scale-105" style="background-image: url('${p.images[0]}')"></div>
            <div class="p-5">
                <div class="flex justify-between items-center">
                    <span class="text-[9px] text-blue-400 font-black uppercase">${p.category_slug}</span>
                </div>
                <h3 class="font-bold text-white mt-1 text-sm">${p.name}</h3>
                <p class="text-green-400 font-bold text-sm mt-1">${formatRupiah(p.price)}</p>
                <button onclick="orderProduct('${p.id}')" class="w-full mt-4 bg-white text-black py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all">Beli Sekarang</button>
            </div>
        </div>
    `).join('');
}

window.filterService = (slug) => {
    // UI Feedback
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-white');
        btn.classList.add('text-gray-400');
    });
    event.currentTarget.classList.add('active', 'border-blue-500', 'text-white');

    const filtered = slug === 'all' ? allProducts : allProducts.filter(p => p.category_slug === slug);
    renderProducts(filtered);
};
