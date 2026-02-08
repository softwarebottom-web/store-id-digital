import { auth, db, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Variabel Global untuk Slider
let currentSlide = 0;
let productSlides = [];

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

// --- LOAD PRODUK (DENGAN SUPORT MULTI-IMAGE) ---
async function loadProducts() {
    const container = document.getElementById('product-container');
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    container.innerHTML = "";
    if (snap.empty) { 
        if(document.getElementById('empty-msg')) document.getElementById('empty-msg').classList.remove('hidden'); 
        return; 
    }

    snap.forEach(docSnap => {
        const d = docSnap.data();
        // Cek apakah ada array images atau hanya image tunggal
        const allImages = d.images || [d.image] || ['https://via.placeholder.com/300x200?text=No+Image'];
        const thumb = allImages[0];
        
        container.innerHTML += `
            <div class="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 transition-all group shadow-lg" 
                 onclick='showDetail("${docSnap.id}", "${d.name}", ${d.price}, ${JSON.stringify(allImages)}, \`${d.description}\`)'>
                <div class="h-40 w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style="background-image: url('${thumb}')"></div>
                <div class="p-4">
                    <h3 class="font-bold text-white text-base truncate">${d.name}</h3>
                    <div class="flex justify-between items-center mt-3">
                        <span class="text-green-400 font-mono text-sm font-bold">${formatRupiah(d.price)}</span>
                        <span class="text-[10px] text-gray-500 font-bold uppercase">${allImages.length} Foto</span>
                    </div>
                </div>
            </div>`;
    });
}

// --- LOGIC MODAL DETAIL DENGAN SLIDER ---
window.showDetail = (id, name, price, images, desc) => {
    productSlides = images;
    currentSlide = 0;

    const detailTitle = document.getElementById('detailTitle');
    const detailPrice = document.getElementById('detailPrice');
    const detailDesc = document.getElementById('detailDesc');
    const buyBtn = document.getElementById('buyBtn');

    if (detailTitle) detailTitle.innerText = name;
    if (detailPrice) detailPrice.innerText = formatRupiah(price);
    if (detailDesc) detailDesc.innerText = desc;
    
    updateSliderUI();

    if (buyBtn) {
        buyBtn.onclick = () => { closeDetail(); buyProduct(id, name, price); };
    }

    document.getElementById('detailModal').classList.remove('hidden');
};

// Fungsi Update Tampilan Slider
function updateSliderUI() {
    const sliderContainer = document.getElementById('imageSlider');
    if (!sliderContainer) return;

    sliderContainer.innerHTML = "";
    productSlides.forEach((img) => {
        sliderContainer.innerHTML += `
            <div class="min-w-full h-full bg-cover bg-center flex-shrink-0" style="background-image: url('${img}')"></div>
        `;
    });
    
    moveSlide(0); // Reset ke foto pertama
}

window.moveSlide = (direction) => {
    currentSlide = (currentSlide + direction + productSlides.length) % productSlides.length;
    const slider = document.getElementById('imageSlider');
    if (slider) {
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
};

window.closeDetail = () => {
    document.getElementById('detailModal').classList.add('hidden');
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
        container.innerHTML += `<div class="bg-[#181818] p-3 rounded border-l-2 border-gray-700 mb-2 hover:bg-gray-800 transition cursor-default text-[11px]"><div class="flex justify-between"><span class="font-bold truncate w-24">${d.productName}</span><span class="${color}">${d.status}</span></div></div>`;
    });
}

// --- ORDER SYSTEM ---
window.buyProduct = async (pid, pname, price) => {
    if(!confirm(`Beli ${pname}?`)) return;
    const user = auth.currentUser;
    try {
        await addDoc(collection(db, "tickets"), { 
            buyerId: user.uid, buyerName: user.displayName, type: 'buy', 
            productId: pid, productName: pname, price: price, 
            status: 'OPEN', createdAt: serverTimestamp() 
        });
        sendDiscordLog("🛒 Order Baru", `**${user.displayName}** memesan **${pname}**`, 15844367);
        alert("Tiket terkirim!"); loadTickets(user.uid);
    } catch (e) { alert("Error: " + e.message); }
};

// --- CONTRACT & LOGOUT ---
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
    document.getElementById('contractContent').innerHTML = `<p>ROLE: ${d.role}<br>GAJI: ${d.salary}</p>`;
    document.getElementById('contractModal').classList.remove('hidden');
};

window.closeContractModal = () => document.getElementById('contractModal').classList.add('hidden');

window.signContract = async () => {
    if(!document.getElementById('agreeCheck').checked) return alert("Setujui dulu!");
    try {
        await updateDoc(doc(db, "contracts", window.pendingContract.id), { status: "SIGNED", signedAt: serverTimestamp() });
        await updateDoc(doc(db, "users", auth.currentUser.uid), { role: window.pendingContract.role });
        alert("Kontrak Ditandatangani!"); window.location.reload();
    } catch (e) { alert(e.message); }
};

window.logout = () => signOut(auth).then(() => window.location.href="index.html");
