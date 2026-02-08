import { auth, db, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- AUTH STATE & INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? snap.data().role : "BUYER";
        document.getElementById('navUsername').innerText = user.displayName;
        if(role === 'OWNER') document.getElementById('btnOwner').classList.remove('hidden');
        
        loadProducts();
        loadTickets(user.uid);
        checkContract(user.uid);
    } else { window.location.href = "index.html"; }
});

// --- LOAD PRODUK DENGAN GAMBAR & SISTEM KLIK DETAIL ---
async function loadProducts() {
    const container = document.getElementById('product-container');
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    container.innerHTML = "";
    if (snap.empty) { 
        const emptyMsg = document.getElementById('empty-msg');
        if(emptyMsg) emptyMsg.classList.remove('hidden'); 
        return; 
    }

    snap.forEach(docSnap => {
        const d = docSnap.data();
        // Menggunakan Base64 string dari database atau placeholder jika kosong
        const img = d.image || 'https://via.placeholder.com/300x200?text=No+Image';
        
        container.innerHTML += `
            <div class="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 transition-all group shadow-lg" 
                 onclick="showDetail('${docSnap.id}', '${d.name}', ${d.price}, '${img}', \`${d.description}\`)">
                <div class="h-40 w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style="background-image: url('${img}')"></div>
                <div class="p-4">
                    <h3 class="font-bold text-white text-base truncate">${d.name}</h3>
                    <div class="flex justify-between items-center mt-3">
                        <span class="text-green-400 font-mono text-sm font-bold">${formatRupiah(d.price)}</span>
                        <span class="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Lihat Detail</span>
                    </div>
                </div>
            </div>`;
    });
}

// --- LOGIC MODAL DETAIL PRODUK ---
window.showDetail = (id, name, price, img, desc) => {
    const detailTitle = document.getElementById('detailTitle');
    const detailPrice = document.getElementById('detailPrice');
    const detailDesc = document.getElementById('detailDesc');
    const detailImage = document.getElementById('detailImage');
    const buyBtn = document.getElementById('buyBtn');

    if (detailTitle) detailTitle.innerText = name;
    if (detailPrice) detailPrice.innerText = formatRupiah(price);
    if (detailDesc) detailDesc.innerText = desc;
    if (detailImage) detailImage.style.backgroundImage = `url('${img}')`;
    
    // Set fungsi tombol beli di dalam modal
    if (buyBtn) {
        buyBtn.onclick = () => {
            closeDetail();
            buyProduct(id, name, price);
        };
    }

    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeDetail = () => {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('hidden');
};

// --- TICKETS SYSTEM ---
async function loadTickets(uid) {
    const container = document.getElementById('ticket-container');
    const q = query(collection(db, "tickets"), where("buyerId", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    container.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        let color = d.status === 'PAID' ? 'text-green-500' : (d.status === 'CLOSED' ? 'text-red-500' : 'text-yellow-500');
        container.innerHTML += `<div class="bg-[#181818] p-3 rounded border-l-2 border-gray-700 mb-2 transition hover:bg-gray-800"><div class="flex justify-between"><span class="font-bold text-xs truncate w-24">${d.productName}</span><span class="text-[10px] ${color}">${d.status}</span></div></div>`;
    });
}

// --- ORDER SYSTEM ---
window.buyProduct = async (pid, pname, price) => {
    if(!confirm(`Apakah Anda yakin ingin membeli ${pname}?`)) return;
    const user = auth.currentUser;
    try {
        const ref = await addDoc(collection(db, "tickets"), { 
            buyerId: user.uid, 
            buyerName: user.displayName, 
            type: 'buy', 
            productId: pid, 
            productName: pname, 
            price: price, 
            status: 'OPEN', 
            createdAt: serverTimestamp() 
        });
        sendDiscordLog("🛒 Order Masuk", `User: **${user.displayName}**\nProduk: ${pname}\nHarga: ${formatRupiah(price)}`, 15844367);
        alert("Tiket pesanan berhasil dibuat! Silakan hubungi admin."); 
        loadTickets(user.uid);
    } catch (e) {
        alert("Terjadi kesalahan: " + e.message);
    }
};

// --- CONTRACT SYSTEM ---
async function checkContract(uid) {
    const q = query(collection(db, "contracts"), where("uid", "==", uid), where("status", "==", "OFFERED"));
    const snap = await getDocs(q);
    if (!snap.empty) {
        document.getElementById('contract-widget').classList.remove('hidden');
        window.pendingContract = { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
}

window.openContractModal = () => {
    const d = window.pendingContract;
    if(!d) return;
    document.getElementById('contractContent').innerHTML = `
        <div class="space-y-2">
            <p><strong>POSISI:</strong> ${d.role}</p>
            <p><strong>GAJI/KOMISI:</strong> ${d.salary}</p>
            <p class="mt-4 text-xs italic text-gray-400">Dengan menandatangani ini, Anda setuju untuk bekerja sesuai prosedur FSF SHOP.</p>
        </div>
    `;
    document.getElementById('contractModal').classList.remove('hidden');
};

window.closeContractModal = () => document.getElementById('contractModal').classList.add('hidden');

window.signContract = async () => {
    if(!document.getElementById('agreeCheck').checked) return alert("Anda harus menyetujui persyaratan!");
    const d = window.pendingContract;
    const user = auth.currentUser;
    try {
        await updateDoc(doc(db, "contracts", d.id), { status: "SIGNED", signedAt: serverTimestamp() });
        await updateDoc(doc(db, "users", user.uid), { role: d.role });
        sendDiscordLog("✍️ Kontrak Ditandatangani", `User **${user.displayName}** sekarang resmi menjadi **${d.role}**`, 65280);
        alert("Selamat! Role Anda telah diperbarui menjadi " + d.role); 
        window.location.reload();
    } catch (e) {
        alert("Gagal memproses kontrak: " + e.message);
    }
};

// --- LOGOUT ---
window.logout = () => signOut(auth).then(() => window.location.href="index.html");
