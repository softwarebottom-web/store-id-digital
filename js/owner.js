import { auth, supabase, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Variabel penampung array gambar
let selectedImagesBase64 = [];

// --- PROTEKSI & AUTH OWNER ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Data role tetap dicek melalui Firebase Firestore
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'OWNER') { 
            initOwner(); 
        } 
        else { window.location.href = "dashboard.html"; }
    } else { window.location.href = "index.html"; }
});

function initOwner() { 
    loadStats(); 
    loadProducts(); 
    loadApplicants(); 
    checkCareerToggle(); 
}

// --- FUNGSI KOMPRESI GAMBAR (Pencegah Error Besar) ---
const compressImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Kompres ke 70% kualitas
        };
    });
};

// --- MULTI-IMAGE SELECT (MAX 15MB & 4 FOTO) ---
window.handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    selectedImagesBase64 = [];
    
    if (files.length > 4) {
        alert("Maksimal 4 foto per produk!");
        event.target.value = "";
        return;
    }

    for (const file of files) {
        if (file.size > 15 * 1024 * 1024) { // Limit 15MB
            alert(`File ${file.name} terlalu besar!`);
            continue;
        }

        const reader = new FileReader();
        const promise = new Promise((resolve) => {
            reader.onload = async (e) => {
                const compressed = await compressImage(e.target.result);
                resolve(compressed);
            };
        });
        reader.readAsDataURL(file);
        const result = await promise;
        selectedImagesBase64.push(result);
    }
    console.log("Semua foto berhasil dikompres dan dimuat.");
};

// --- PRODUK MANAGEMENT (SUPABASE) ---
async function loadProducts() {
    const list = document.getElementById('productList');
    
    // Fetch data dari tabel 'products' Supabase
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    list.innerHTML = "";
    products.forEach(p => {
        const thumb = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/50';
        
        list.innerHTML += `
            <div class="bg-[#202020] p-3 flex justify-between items-center border border-gray-800 rounded mb-2 hover:border-accent transition">
                <div class="flex items-center gap-3">
                    <img src="${thumb}" class="w-12 h-12 object-cover rounded border border-gray-700">
                    <div>
                        <p class="font-bold text-sm text-white">${p.name}</p>
                        <p class="text-[10px] text-green-400">${formatRupiah(p.price)} | ${p.images ? p.images.length : 0} Foto</p>
                    </div>
                </div>
                <button onclick="delProd('${p.id}')" class="text-red-500 text-xs font-bold border border-red-900/50 px-3 py-1 rounded hover:bg-red-900 transition">HAPUS</button>
            </div>`;
    });
}

document.getElementById('addProductForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Uploading to Supabase...";

    try {
        const { error } = await supabase
            .from('products')
            .insert([{
                name: document.getElementById('pName').value,
                price: parseInt(document.getElementById('pPrice').value),
                description: document.getElementById('pDesc').value,
                images: selectedImagesBase64
            }]);

        if (error) throw error;
        
        alert("Produk Berhasil di-Publish ke Supabase!");
        e.target.reset();
        selectedImagesBase64 = [];
        loadProducts();
    } catch (err) {
        alert("Gagal: " + err.message);
    } finally {
        btn.disabled = false; btn.innerText = "POST PRODUCT";
    }
});

window.delProd = async(id) => {
    if(confirm("Hapus produk ini dari Supabase?")) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) loadProducts();
    }
};

// --- STATS & LOG TRANSAKSI (SUPABASE) ---
async function loadStats() {
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    let total = 0, count = 0, html = "";
    tickets.forEach(data => {
        if (data.status === 'PAID') {
            total += parseInt(data.price);
            count++;
        }
        const statusColor = data.status === 'PAID' ? 'text-green-400' : 'text-yellow-500';
        html += `<tr class="border-b border-gray-800">
                    <td class="p-2">${data.buyer_name}</td>
                    <td class="p-2">${data.product_name}</td>
                    <td class="p-2 font-mono ${statusColor}">${formatRupiah(data.price)} [${data.status}]</td>
                 </tr>`;
    });

    document.getElementById('totalRev').innerText = formatRupiah(total);
    document.getElementById('totalSales').innerText = count;
    document.getElementById('trxTable').innerHTML = html;
}

// --- TOGGLE KARIR (SUPABASE) ---
async function checkCareerToggle() {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'career_status').single();
    const btn = document.getElementById('btnToggleCareer');
    if (!error && btn) {
        const isOpen = data.value.isOpen;
        btn.innerText = isOpen ? "TUTUP LOWONGAN" : "BUKA LOWONGAN";
        btn.className = isOpen ? "bg-red-600 px-4 py-2 rounded text-white font-bold" : "bg-green-600 px-4 py-2 rounded text-white font-bold";
    }
}

window.toggleCareer = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'career_status').single();
    const newState = !data.value.isOpen;
    
    await supabase.from('settings').update({ value: { isOpen: newState } }).eq('key', 'career_status');
    alert("Status karir diperbarui!");
    checkCareerToggle();
};

// --- HRD & APPLICANTS (TETAP FIREBASE UNTUK KEAMANAN DATA USER) ---
async function loadApplicants() {
    const list = document.getElementById('applicantList');
    // ... (Logika Firebase applications tetap sama)
}

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
};
