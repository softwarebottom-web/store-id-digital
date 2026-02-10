import { auth, db, supabase, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Variabel Global untuk Slider
let currentSlide = 0;
let productSlides = [];

// --- AUTH STATE & INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Cek Role di Firebase
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? snap.data().role : "BUYER";
        
        document.getElementById('navUsername').innerText = user.displayName;
        if(role === 'OWNER') document.getElementById('btnOwner').classList.remove('hidden');
        
        // Panggil Data dari Supabase
        loadProducts();
        loadTickets(user.uid);
        
        // Kontrak tetap di Firebase (Data Sensitif)
        checkContract(user.uid); 
    } else { 
        window.location.href = "index.html"; 
    }
});

// --- LOAD PRODUK (SUPABASE) ---
async function loadProducts() {
    const container = document.getElementById('product-container');
    
    // Ambil data dari tabel 'products' di Supabase
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error.message);
        return;
    }

    container.innerHTML = "";
    if (!products || products.length === 0) { 
        if(document.getElementById('empty-msg')) document.getElementById('empty-msg').classList.remove('hidden'); 
        return; 
    }

    products.forEach(p => {
        // Supabase menggunakan array 'images'
        const allImages = p.images && p.images.length > 0 ? p.images : ['https://via.placeholder.com/300x200?text=No+Image'];
        const thumb = allImages[0];
        
        container.innerHTML += `
            <div class="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 transition-all group shadow-lg" 
                 onclick='showDetail("${p.id}", "${p.name}", ${p.price}, ${JSON.stringify(allImages)}, \`${p.description}\`)'>
                <div class="h-40 w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style="background-image: url('${thumb}')"></div>
                <div class="p-4">
                    <h3 class="font-bold text-white text-base truncate">${p.name}</h3>
                    <div class="flex justify-between items-center mt-3">
                        <span class="text-green-400 font-mono text-sm font-bold">${formatRupiah(p.price)}</span>
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

    document.getElementById('detailTitle').innerText = name;
    document.getElementById('detailPrice').innerText = formatRupiah(price);
    document.getElementById('detailDesc').innerText = desc;
    
    updateSliderUI();

    const buyBtn = document.getElementById('buyBtn');
    if (buyBtn) {
        buyBtn.onclick = () => { closeDetail(); buyProduct(id, name, price); };
    }

    document.getElementById('detailModal').classList.remove('hidden');
};

function updateSliderUI() {
    const sliderContainer = document.getElementById('imageSlider');
    const counter = document.getElementById('slideCount');
    if (!sliderContainer) return;

    sliderContainer.innerHTML = "";
    productSlides.forEach((img) => {
        sliderContainer.innerHTML += `<div class="slide-item" style="background-image: url('${img}')"></div>`;
    });
    
    if(counter) counter.innerText = `1 / ${productSlides.length}`;
    moveSlide(0);
}

window.moveSlide = (direction) => {
    currentSlide = (currentSlide + direction + productSlides.length) % productSlides.length;
    const slider = document.getElementById('imageSlider');
    const counter = document.getElementById('slideCount');
    if (slider) {
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    if(counter) counter.innerText = `${currentSlide + 1} / ${productSlides.length}`;
};

window.closeDetail = () => {
    document.getElementById('detailModal').classList.add('hidden');
};

// --- TICKETS SYSTEM (SUPABASE) ---
async function loadTickets(uid) {
    const container = document.getElementById('ticket-container');
    
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('buyer_id', uid)
        .order('created_at', { ascending: false });

    if (error) return;

    container.innerHTML = "";
    tickets.forEach(t => {
        let color = t.status === 'PAID' ? 'text-green-500' : (t.status === 'CLOSED' ? 'text-red-500' : 'text-yellow-500');
        container.innerHTML += `
            <div class="bg-[#181818] p-3 rounded border-l-2 border-gray-700 mb-2 hover:bg-gray-800 transition cursor-default text-[11px]">
                <div class="flex justify-between">
                    <span class="font-bold truncate w-24">${t.product_name}</span>
                    <span class="${color}">${t.status}</span>
                </div>
            </div>`;
    });
}

// --- ORDER SYSTEM (SUPABASE) ---
window.buyProduct = async (pid, pname, price) => {
    if(!confirm(`Beli ${pname}?`)) return;
    const user = auth.currentUser;
    
    try {
        const { error } = await supabase
            .from('tickets')
            .insert([{
                buyer_id: user.uid,
                buyer_name: user.displayName,
                product_name: pname,
                price: price,
                status: 'OPEN'
            }]);

        if (error) throw error;

        sendDiscordLog("🛒 Order Baru", `**${user.displayName}** memesan **${pname}**`, 15844367);
        alert("Tiket terkirim ke Supabase!"); 
        loadTickets(user.uid);
    } catch (e) { 
        alert("Error: " + e.message); 
    }
};

// --- LOGOUT & CONTRACT (TETAP FIREBASE) ---
window.logout = () => signOut(auth).then(() => window.location.href="index.html");

// Fungsi kontrak tetap menggunakan Firestore karena melibatkan perubahan Role User secara langsung
async function checkContract(uid) {
    // ... (Logika Firebase kontrak kamu tetap sama)
}
