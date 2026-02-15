import { auth, db, supabase, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// STATE GLOBAL
let allProducts = [];

// --- 1. INISIALISASI ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Setup User Info
        document.getElementById('navUsername').innerText = user.displayName || "User";
        document.getElementById('userAvatar').src = user.photoURL || "https://via.placeholder.com/40";
        
        // Panggil Data Utama
        loadCategories();      // Tarik kategori custom Owner
        loadProducts();        // Tarik produk
        checkRole(user.uid);   // Cek Role (Buyer/Worker/Owner)
        monitorContract(user.uid); // Cek Kontrak Kerja Realtime
    } else {
        window.location.href = "index.html";
    }
});

// --- 2. LOAD KATEGORI (CUSTOM OWNER) ---
async function loadCategories() {
    const nav = document.getElementById('nav-categories');
    
    // Ambil data dari tabel 'categories' Supabase
    const { data: cats, error } = await supabase.from('categories').select('*').order('name');

    if (error || !cats) {
        nav.innerHTML = `<p class="text-xs text-red-500">Gagal load kategori.</p>`;
        return;
    }

    // Tombol Default "Semua"
    let html = `
        <button onclick="filterService('all')" class="cat-btn active px-6 py-2 rounded-full text-xs font-bold border border-gray-800 transition-all whitespace-nowrap bg-[#1a1a1a] hover:border-blue-500">
            Semua
        </button>
    `;

    // Render Kategori dari Database
    cats.forEach(c => {
        // Jika logo kosong, pakai icon default
        const logo = c.logo_url || "https://cdn-icons-png.flaticon.com/512/10629/10629607.png";
        
        html += `
            <button onclick="filterService('${c.slug}')" class="cat-btn bg-[#1a1a1a] border border-gray-800 px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-2 hover:border-blue-500 transition-all">
                <img src="${logo}" class="w-4 h-4 object-contain">
                <span>${c.name}</span>
            </button>`;
    });

    nav.innerHTML = html;
}

// --- 3. LOAD & RENDER PRODUK ---
async function loadProducts() {
    const container = document.getElementById('product-container');
    
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    allProducts = data; // Simpan ke variabel global untuk filtering lokal
    renderProducts(allProducts);
}

// --- 4. LOGIKA FILTER ---
window.filterService = (slug) => {
    // 1. Update Tampilan Tombol
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active'); // Hapus kelas aktif
        btn.classList.add('bg-[#1a1a1a]'); // Balikin warna gelap
    });
    
    // Tombol yang diklik jadi aktif
    event.currentTarget.classList.add('active');
    event.currentTarget.classList.remove('bg-[#1a1a1a]');

    // 2. Filter Data Produk
    if (slug === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category_slug === slug);
        renderProducts(filtered);
    }
};

// --- 5. RENDER CARD PRODUK ---
function renderProducts(data) {
    const container = document.getElementById('product-container');
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-10 text-gray-600">
                <i class="fa-solid fa-box-open text-3xl mb-2"></i>
                <p class="text-xs italic">Belum ada layanan di kategori ini.</p>
            </div>`;
        return;
    }

    data.forEach(p => {
        // Handle Base64 Images (Array)
        const thumb = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300x200';
        
        container.innerHTML += `
            <div class="glass rounded-3xl overflow-hidden border border-gray-800 hover:border-blue-500 transition-all duration-300 group">
                <div class="h-40 w-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500" 
                     style="background-image: url('${thumb}')">
                </div>
                
                <div class="p-5">
                    <div class="flex justify-between items-start mb-2">
                         <span class="text-[9px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded font-bold uppercase tracking-wider border border-blue-500/20">
                            ${p.category_slug || 'Service'}
                         </span>
                    </div>
                    
                    <h3 class="font-bold text-white text-base truncate mb-1">${p.name}</h3>
                    <p class="text-green-400 font-mono font-bold text-sm">${formatRupiah(p.price)}</p>
                    
                    <button onclick="autoPurchase('${p.id}', '${p.name}', ${p.price})" 
                        class="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                        BELI & BUKA TIKET
                    </button>
                </div>
            </div>`;
    });
}

// --- 6. AUTO TICKET (BELI) ---
window.autoPurchase = async (pid, pname, price) => {
    const user = auth.currentUser;
    if(!confirm(`Konfirmasi order: ${pname}?\nTiket konsultasi akan otomatis dibuat.`)) return;

    try {
        const { data, error } = await supabase.from('tickets').insert([{
            buyer_id: user.uid,
            buyer_name: user.displayName,
            product_name: pname,
            price: price,
            status: 'OPEN'
        }]).select().single();

        if (error) throw error;

        sendDiscordLog("🛒 Order Baru", `**${user.displayName}** membeli **${pname}** seharga ${formatRupiah(price)}`, 3447003);
        
        // Redirect ke Room Ticket
        window.location.href = `ticket.html?id=${data.id}`;

    } catch (e) {
        alert("Gagal membuat tiket: " + e.message);
    }
};

// --- 7. CEK ROLE & KONTRAK (REALTIME) ---
async function checkRole(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
        const role = snap.data().role || "Buyer";
        document.getElementById('userRole').innerText = role;
    }
}

function monitorContract(uid) {
    // Listen Contracts status OFFERED
    onSnapshot(query(collection(db, "contracts"), where("uid", "==", uid), where("status", "==", "OFFERED")), (snap) => {
        if (!snap.empty) {
            const contract = snap.docs[0].data();
            const docId = snap.docs[0].id;

            // Tampilkan Alert Konfirmasi
            const setuju = confirm(`📜 PENAWARAN KONTRAK KERJA!\n\nNama: ${contract.candidateName}\nPosisi: WORKER\nGaji: ${contract.salary}\n\nTerima tawaran ini?`);
            
            if (setuju) {
                acceptContract(docId, uid);
            }
        }
    });
}

async function acceptContract(contractId, uid) {
    try {
        // 1. Update Status Kontrak
        await updateDoc(doc(db, "contracts", contractId), { status: "SIGNED" });
        
        // 2. Update Role User
        const q = query(collection(db, "users"), where("uid", "==", uid));
        const userSnap = await getDocs(q);
        if(!userSnap.empty) {
            await updateDoc(doc(db, "users", userSnap.docs[0].id), { role: "WORKER" });
        }

        alert("Selamat! Anda resmi menjadi Worker FSF SHOP.");
        window.location.reload();
    } catch (e) {
        console.error("Error accept contract:", e);
    }
}
