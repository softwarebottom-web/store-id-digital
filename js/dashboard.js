import { auth, db, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

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

async function loadProducts() {
    const container = document.getElementById('product-container');
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    container.innerHTML = "";
    if (snap.empty) { document.getElementById('empty-msg').classList.remove('hidden'); return; }
    snap.forEach(doc => {
        const d = doc.data();
        container.innerHTML += `
            <div class="bg-[#1e1e1e] border border-gray-800 rounded p-4 flex flex-col justify-between hover:border-blue-500 transition">
                <div><h3 class="font-bold text-white text-lg">${d.name}</h3><p class="text-gray-400 text-sm mt-2">${d.description}</p></div>
                <div class="mt-4 flex justify-between items-center border-t border-gray-700 pt-3">
                    <span class="text-green-400 font-mono font-bold">${formatRupiah(d.price)}</span>
                    <button onclick="buyProduct('${doc.id}', '${d.name}', ${d.price})" class="bg-blue-600 px-4 py-2 rounded text-xs text-white font-bold hover:bg-blue-700">ORDER</button>
                </div>
            </div>`;
    });
}

async function loadTickets(uid) {
    const container = document.getElementById('ticket-container');
    const q = query(collection(db, "tickets"), where("buyerId", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    container.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        let color = d.status === 'PAID' ? 'text-green-500' : (d.status === 'CLOSED' ? 'text-red-500' : 'text-yellow-500');
        container.innerHTML += `<div class="bg-[#181818] p-3 rounded border-l-2 border-gray-700 mb-2"><div class="flex justify-between"><span class="font-bold text-xs truncate w-24">${d.productName}</span><span class="text-[10px] ${color}">${d.status}</span></div></div>`;
    });
}

async function checkContract(uid) {
    const q = query(collection(db, "contracts"), where("uid", "==", uid), where("status", "==", "OFFERED"));
    const snap = await getDocs(q);
    if (!snap.empty) {
        document.getElementById('contract-widget').classList.remove('hidden');
        window.pendingContract = { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
}

window.buyProduct = async (pid, pname, price) => {
    if(!confirm(`Beli ${pname}?`)) return;
    const user = auth.currentUser;
    const ref = await addDoc(collection(db, "tickets"), { buyerId: user.uid, buyerName: user.displayName, type: 'buy', productId: pid, productName: pname, price: price, status: 'OPEN', createdAt: serverTimestamp() });
    sendDiscordLog("🛒 Order Masuk", `User: ${user.displayName}\nItem: ${pname}`, 15844367);
    alert("Tiket dibuat!"); loadTickets(user.uid);
};

window.openContractModal = () => {
    const d = window.pendingContract;
    document.getElementById('contractContent').innerHTML = `<p><strong>ROLE:</strong> ${d.role}<br><strong>GAJI:</strong> ${d.salary}</p><p class="mt-4">Dengan ini saya menyetujui kontrak kerja FSF SHOP.</p>`;
    document.getElementById('contractModal').classList.remove('hidden');
};
window.closeContractModal = () => document.getElementById('contractModal').classList.add('hidden');

window.signContract = async () => {
    if(!document.getElementById('agreeCheck').checked) return alert("Centang persetujuan!");
    const d = window.pendingContract;
    await updateDoc(doc(db, "contracts", d.id), { status: "SIGNED", signedAt: serverTimestamp() });
    await updateDoc(doc(db, "users", auth.currentUser.uid), { role: d.role });
    sendDiscordLog("✍️ Contract Signed", `User **${auth.currentUser.displayName}** is now **${d.role}**`, 65280);
    alert("Kontrak sah! Role anda telah diperbarui."); window.location.reload();
};

window.logout = () => signOut(auth).then(() => window.location.href="index.html");
