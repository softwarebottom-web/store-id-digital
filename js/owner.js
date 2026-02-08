import { auth, db, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'OWNER') { initOwner(); } 
        else { window.location.href = "dashboard.html"; }
    } else { window.location.href = "index.html"; }
});

function initOwner() { loadStats(); loadProducts(); loadApplicants(); }

async function loadStats() {
    const q = query(collection(db, "tickets"), where("status", "==", "PAID"));
    const snap = await getDocs(q);
    let total = 0, count = 0, html = "";
    snap.forEach(d => {
        const data = d.data();
        total += parseInt(data.price); count++;
        html += `<tr class="border-b border-gray-800"><td class="p-2">${data.buyerName}</td><td class="p-2">${data.productName}</td><td class="p-2 text-green-400">${formatRupiah(data.price)}</td></tr>`;
    });
    document.getElementById('totalRev').innerText = formatRupiah(total);
    document.getElementById('trxTable').innerHTML = html;
}

async function loadProducts() {
    const list = document.getElementById('productList');
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `<div class="bg-[#202020] p-2 flex justify-between border border-gray-700 rounded mb-2"><span>${d.name}</span><button onclick="delProd('${doc.id}')" class="text-red-500 text-xs">HAPUS</button></div>`;
    });
}

document.getElementById('addProductForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    await addDoc(collection(db, "products"), { name: document.getElementById('pName').value, price: parseInt(document.getElementById('pPrice').value), description: document.getElementById('pDesc').value, createdAt: serverTimestamp() });
    alert("Produk Ditambah!"); document.getElementById('addProductForm').reset(); loadProducts();
});

window.delProd = async(id) => { if(confirm("Hapus?")) { await deleteDoc(doc(db, "products", id)); loadProducts(); } };

// HRD
async function loadApplicants() {
    const list = document.getElementById('applicantList');
    const q = query(collection(db, "applications"), where("status", "==", "PENDING"));
    const snap = await getDocs(q);
    list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `<div class="bg-[#202020] p-2 border border-gray-700 rounded mb-2 text-xs"><p><strong>${d.realName}</strong> (${d.roleTarget})</p><button onclick="selApp('${d.uid}', '${d.realName}')" class="bg-blue-600 px-2 py-1 rounded text-white mt-1">PILIH</button></div>`;
    });
}

window.selApp = (uid, name) => { document.getElementById('c_uid').value = uid; document.getElementById('c_name').value = name; };

document.getElementById('contractForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    await addDoc(collection(db, "contracts"), { uid: document.getElementById('c_uid').value, candidateName: document.getElementById('c_name').value, role: document.getElementById('c_role').value, salary: document.getElementById('c_salary').value, status: "OFFERED", createdAt: serverTimestamp() });
    alert("Kontrak Dikirim!"); document.getElementById('contractForm').reset();
});

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
};
