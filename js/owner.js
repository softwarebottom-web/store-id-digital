import { auth, db, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Variabel penampung teks gambar
let selectedImageBase64 = "";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'OWNER') { initOwner(); } 
        else { window.location.href = "dashboard.html"; }
    } else { window.location.href = "index.html"; }
});

function initOwner() { loadStats(); loadProducts(); loadApplicants(); }

// --- FUNGSI CONVERT GAMBAR KE TEKS (BASE64) ---
window.handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        // Validasi Ukuran (Max 500KB agar database tidak berat)
        if (file.size > 500 * 1024) {
            alert("Ukuran file terlalu besar! Maksimal 500KB.");
            event.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImageBase64 = e.target.result; // Hasil teks gambar
            console.log("Gambar berhasil dikonversi ke Base64");
        };
        reader.readAsDataURL(file);
    }
};

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

async function loadProducts() {
    const list = document.getElementById('productList');
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    list.innerHTML = "";
    snap.forEach(docSnap => {
        const d = docSnap.data();
        list.innerHTML += `
            <div class="bg-[#202020] p-3 flex justify-between items-center border border-gray-700 rounded mb-2 hover:border-gray-500 transition">
                <div class="flex items-center gap-3">
                    <img src="${d.image || 'https://via.placeholder.com/50'}" class="w-10 h-10 object-cover rounded border border-gray-600">
                    <div>
                        <p class="font-bold text-sm text-white">${d.name}</p>
                        <p class="text-[10px] text-green-400 font-mono">${formatRupiah(d.price)}</p>
                    </div>
                </div>
                <button onclick="delProd('${docSnap.id}')" class="text-red-500 text-xs border border-red-900 px-2 py-1 rounded">HAPUS</button>
            </div>`;
    });
}

document.getElementById('addProductForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Uploading Data...";

    const pName = document.getElementById('pName').value;
    const pPrice = parseInt(document.getElementById('pPrice').value);
    const pDesc = document.getElementById('pDesc').value;

    try {
        await addDoc(collection(db, "products"), { 
            name: pName, 
            price: pPrice, 
            description: pDesc, 
            image: selectedImageBase64, // Menyimpan teks gambar
            createdAt: serverTimestamp() 
        });
        
        alert("Produk Berhasil Ditambah!"); 
        e.target.reset(); 
        selectedImageBase64 = ""; // Reset variabel
        loadProducts(); 
    } catch (err) {
        alert("Gagal: " + err.message);
    } finally {
        btn.disabled = false; btn.innerText = "POST PRODUCT";
    }
});

window.delProd = async(id) => { if(confirm("Hapus?")) { await deleteDoc(doc(db, "products", id)); loadProducts(); } };

// HRD & Kontrak Tetap Sama
async function loadApplicants() {
    const list = document.getElementById('applicantList');
    const q = query(collection(db, "applications"), where("status", "==", "PENDING"));
    const snap = await getDocs(q);
    list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `<div class="bg-[#202020] p-2 border border-gray-700 rounded mb-2 text-xs"><div class="flex justify-between items-start"><div><p><strong>${d.realName}</strong> (${d.roleTarget})</p></div><button onclick="selApp('${d.uid}', '${d.realName}')" class="bg-blue-600 px-2 py-1 rounded text-white mt-1">PILIH</button></div></div>`;
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
