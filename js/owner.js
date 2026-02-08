import { auth, db, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where, orderBy, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Variabel penampung array gambar
let selectedImagesBase64 = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'OWNER') { initOwner(); } 
        else { window.location.href = "dashboard.html"; }
    } else { window.location.href = "index.html"; }
});

function initOwner() { loadStats(); loadProducts(); loadApplicants(); checkCareerToggle(); }

// --- FUNGSI MULTI-IMAGE CONVERT (Max 15MB & Support WebP) ---
window.handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    selectedImagesBase64 = []; // Reset penampung
    
    if (files.length > 4) {
        alert("Maksimal 4 foto per produk!");
        event.target.value = "";
        return;
    }

    files.forEach(file => {
        // Limit 15MB per file
        if (file.size > 15 * 1024 * 1024) {
            alert(`File ${file.name} terlalu besar! Maksimal 15MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImagesBase64.push(e.target.result);
            console.log("Foto dimuat: " + file.name);
        };
        reader.readAsDataURL(file);
    });
};

// --- SETTINGS: TOGGLE KARIR ---
async function checkCareerToggle() {
    const careerRef = doc(db, "settings", "career_status");
    const snap = await getDoc(careerRef);
    const btn = document.getElementById('btnToggleCareer');
    if (snap.exists() && btn) {
        const isOpen = snap.data().isOpen;
        btn.innerText = isOpen ? "TUTUP LOWONGAN" : "BUKA LOWONGAN";
        btn.className = isOpen ? "bg-red-600 px-4 py-2 rounded text-white font-bold" : "bg-green-600 px-4 py-2 rounded text-white font-bold";
    }
}

window.toggleCareer = async () => {
    const careerRef = doc(db, "settings", "career_status");
    const snap = await getDoc(careerRef);
    const currentState = snap.exists() ? snap.data().isOpen : false;
    
    await setDoc(careerRef, { isOpen: !currentState }, { merge: true });
    alert("Status karir berhasil diubah!");
    checkCareerToggle();
};

// --- PRODUK MANAGEMENT ---
async function loadProducts() {
    const list = document.getElementById('productList');
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    list.innerHTML = "";
    snap.forEach(docSnap => {
        const d = docSnap.data();
        // Ambil foto pertama untuk thumbnail
        const thumb = (d.images && d.images.length > 0) ? d.images[0] : (d.image || 'https://via.placeholder.com/50');
        
        list.innerHTML += `
            <div class="bg-[#202020] p-3 flex justify-between items-center border border-gray-800 rounded mb-2 hover:border-accent transition">
                <div class="flex items-center gap-3">
                    <img src="${thumb}" class="w-12 h-12 object-cover rounded border border-gray-700">
                    <div>
                        <p class="font-bold text-sm text-white">${d.name}</p>
                        <p class="text-[10px] text-green-400">${formatRupiah(d.price)} | ${d.images ? d.images.length : 1} Foto</p>
                    </div>
                </div>
                <button onclick="delProd('${docSnap.id}')" class="text-red-500 text-xs font-bold border border-red-900/50 px-3 py-1 rounded hover:bg-red-900 transition">HAPUS</button>
            </div>`;
    });
}

document.getElementById('addProductForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Processing High Res Data...";

    try {
        await addDoc(collection(db, "products"), { 
            name: document.getElementById('pName').value, 
            price: parseInt(document.getElementById('pPrice').value), 
            description: document.getElementById('pDesc').value, 
            images: selectedImagesBase64, // Menyimpan array gambar
            createdAt: serverTimestamp() 
        });
        
        alert("Produk Berhasil Ditambah!"); 
        e.target.reset(); 
        selectedImagesBase64 = []; 
        loadProducts(); 
    } catch (err) { alert("Gagal: " + err.message); } 
    finally { btn.disabled = false; btn.innerText = "POST PRODUCT"; }
});

// --- LOAD STATS & HRD (Sesuai Struktur Awal) ---
async function loadStats() {
    const q = query(collection(db, "tickets"), where("status", "==", "PAID"));
    const snap = await getDocs(q);
    let total = 0, count = 0, html = "";
    snap.forEach(d => {
        const data = d.data();
        total += parseInt(data.price); count++;
        html += `<tr class="border-b border-gray-800"><td class="p-2">${data.buyerName}</td><td class="p-2">${data.productName}</td><td class="p-2 text-green-400 font-mono">${formatRupiah(data.price)}</td></tr>`;
    });
    document.getElementById('totalRev').innerText = formatRupiah(total);
    document.getElementById('totalSales').innerText = count;
    document.getElementById('trxTable').innerHTML = html;
}

window.delProd = async(id) => { if(confirm("Hapus produk ini?")) { await deleteDoc(doc(db, "products", id)); loadProducts(); } };

async function loadApplicants() {
    const list = document.getElementById('applicantList');
    const q = query(collection(db, "applications"), where("status", "==", "PENDING"));
    const snap = await getDocs(q);
    list.innerHTML = "";
    snap.forEach(docSnap => {
        const d = docSnap.data();
        list.innerHTML += `<div class="bg-[#202020] p-2 border border-gray-700 rounded mb-2 text-xs flex justify-between items-center"><div><strong>${d.realName}</strong> (${d.roleTarget})</div><button onclick="selApp('${d.uid}', '${d.realName}')" class="bg-accent px-2 py-1 rounded text-white">PILIH</button></div>`;
    });
}

window.selApp = (uid, name) => { document.getElementById('c_uid').value = uid; document.getElementById('c_name').value = name; };

document.getElementById('contractForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    await addDoc(collection(db, "contracts"), { uid: document.getElementById('c_uid').value, candidateName: document.getElementById('c_name').value, role: document.getElementById('c_role').value, salary: document.getElementById('c_salary').value, status: "OFFERED", createdAt: serverTimestamp() });
    alert("Kontrak Terkirim!"); document.getElementById('contractForm').reset();
});

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
};
