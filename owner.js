import { auth, db, supabase, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { 
    collection, onSnapshot, addDoc, deleteDoc, doc, getDoc, 
    updateDoc, serverTimestamp, query, orderBy, setDoc 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// STATE GLOBAL
let selectedImages = [];
let currentCareerStatus = false;

// --- 1. AUTH & ROLE CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === "OWNER") {
            initOwner();
        } else { 
            window.location.href = "dashboard.html"; 
        }
    } else { 
        window.location.href = "index.html"; 
    }
});

function initOwner() {
    loadStats();
    loadCategories();
    loadApplicants();
    loadContractLogs();
    monitorCareerStatus();
}

// --- 2. MANAJEMEN KATEGORI (SUPABASE) ---
window.saveCategory = async () => {
    const name = document.getElementById('catName').value;
    const logo = document.getElementById('catLogo').value;
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    if (!name || !logo) return alert("Nama & Logo kategori wajib diisi!");

    const { error } = await supabase.from('categories').insert([{ name, logo_url: logo, slug }]);
    if (!error) {
        alert("Kategori " + name + " berhasil dibuat!");
        location.reload();
    } else { alert("Gagal: " + error.message); }
};

async function loadCategories() {
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    const list = document.getElementById('categoryList');
    const select = document.getElementById('pCategory');

    if (list) {
        list.innerHTML = cats.map(c => `
            <div class="flex items-center justify-between p-3 glass rounded-2xl border border-gray-800">
                <div class="flex items-center gap-3">
                    <img src="${c.logo_url}" class="w-6 h-6 object-contain">
                    <span class="text-xs font-bold">${c.name}</span>
                </div>
                <button onclick="deleteCategory('${c.id}')" class="text-red-500 text-[10px] italic">Hapus</button>
            </div>
        `).join('') || '<p class="text-gray-600 text-xs italic">Belum ada kategori.</p>';
    }

    if (select) {
        select.innerHTML = `<option value="">-- PILIH KATEGORI --</option>` + 
            cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
    }
}

window.deleteCategory = async (id) => {
    if (confirm("Hapus kategori?")) {
        await supabase.from('categories').delete().eq('id', id);
        loadCategories();
    }
};

// --- 3. MANAJEMEN PRODUK (4 FOTO BASE64) ---
window.handleFileSelect = (e) => {
    const files = e.target.files;
    selectedImages = [];
    if (files.length > 4) return alert("Maksimal 4 foto!");

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => selectedImages.push(event.target.result);
        reader.readAsDataURL(file);
    });
};

window.postProduct = async () => {
    const btn = document.getElementById('btnPost');
    const payload = {
        name: document.getElementById('pName').value,
        price: parseInt(document.getElementById('pPrice').value),
        description: document.getElementById('pDesc').value,
        category_slug: document.getElementById('pCategory').value,
        images: selectedImages
    };

    if (!payload.category_slug || selectedImages.length === 0) return alert("Lengkapi data produk!");

    btn.innerText = "POSTING...";
    btn.disabled = true;

    const { error } = await supabase.from('products').insert([payload]);
    if (!error) {
        alert("Produk berhasil di-publish!");
        location.reload();
    } else {
        alert("Gagal: " + error.message);
        btn.innerText = "Publish Produk";
        btn.disabled = false;
    }
};

// --- 4. HRD & KONTRAK (FIRESTORE) ---
function loadApplicants() {
    onSnapshot(collection(db, "applications"), (snap) => {
        const container = document.getElementById('applicantList');
        container.innerHTML = snap.docs.map(d => {
            const data = d.data();
            return `
                <div class="glass p-5 rounded-3xl border border-gray-800 flex justify-between items-center mb-4">
                    <div>
                        <p class="font-bold text-white text-sm">${data.realName}</p>
                        <p class="text-[10px] text-blue-400 font-black uppercase tracking-widest">${data.roleTarget}</p>
                        <p class="text-[8px] text-gray-600">UID: ${data.uid}</p>
                    </div>
                    <button onclick="accApplicant('${data.uid}', '${data.realName}', '${d.id}')" class="bg-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold">ACC & KONTRAK</button>
                </div>`;
        }).join('') || '<p class="text-gray-600 text-xs italic">Belum ada pelamar baru.</p>';
    });
}

window.accApplicant = async (uid, name, docId) => {
    const gaji = prompt(`Gaji/Komisi untuk ${name}:`, "70% per project");
    if (!gaji) return;

    await addDoc(collection(db, "contracts"), {
        uid, candidateName: name, salary: gaji, status: "OFFERED", createdAt: serverTimestamp()
    });
    await deleteDoc(doc(db, "applications", docId));
    alert("Kontrak Terkirim!");
};

function loadContractLogs() {
    const q = query(collection(db, "contracts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const container = document.getElementById('contractLogs');
        container.innerHTML = snap.docs.map(d => {
            const c = d.data();
            const color = c.status === 'SIGNED' ? 'text-green-500' : 'text-yellow-500';
            return `
                <div class="p-3 bg-black/20 border-b border-gray-800 flex justify-between items-center text-[10px]">
                    <div><p class="font-bold text-white">${c.candidateName}</p><p class="text-gray-500">${c.salary}</p></div>
                    <p class="${color} font-black uppercase text-[9px]">${c.status}</p>
                </div>`;
        }).join('');
    });
}

// --- 5. SAKLAR OPEN/CLOSE KARIR ---
function monitorCareerStatus() {
    onSnapshot(doc(db, "settings", "career"), (snap) => {
        if (snap.exists()) {
            currentCareerStatus = snap.data().isOpen;
            const btn = document.getElementById('btnToggleCareer');
            if (btn) {
                btn.innerText = currentCareerStatus ? "OPEN (REKRUTMEN AKTIF)" : "CLOSED (REKRUTMEN TUTUP)";
                btn.className = `px-6 py-3 rounded-xl font-black transition text-[10px] tracking-widest ${currentCareerStatus ? 'bg-green-600 shadow-lg shadow-green-900/20' : 'bg-red-600 shadow-lg shadow-red-900/20'}`;
            }
        }
    });
}

window.toggleCareer = async () => {
    const careerRef = doc(db, "settings", "career");
    try {
        await updateDoc(careerRef, { isOpen: !currentCareerStatus });
    } catch (e) {
        await setDoc(careerRef, { isOpen: true });
    }
};

// --- 6. STATS & ACCOUNTING ---
async function loadStats() {
    const { data: trx } = await supabase.from('tickets').select('price').eq('status', 'PAID');
    let total = 0;
    trx?.forEach(t => total += t.price);
    document.getElementById('totalRev').innerText = formatRupiah(total);
    document.getElementById('totalSales').innerText = trx?.length || 0;
}

// UI Switcher
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('nav-active', 'bg-gray-800', 'text-white'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('nav-active', 'bg-gray-800', 'text-white');
};
