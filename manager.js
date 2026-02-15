import { db } from './config.js';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

onSnapshot(collection(db, "applications"), (snap) => {
    const list = document.getElementById('appList');
    list.innerHTML = snap.docs.map(d => {
        const item = d.data();
        return `
            <div class="p-4 bg-black/40 rounded-2xl mb-3 flex justify-between items-center border border-gray-800">
                <div>
                    <p class="font-bold text-sm">${item.realName}</p>
                    <p class="text-[10px] text-blue-400 uppercase font-black">${item.roleTarget}</p>
                </div>
                <button onclick="accLamaran('${item.uid}', '${item.realName}', '${d.id}')" class="bg-blue-600 px-4 py-1 rounded-lg text-[10px] font-black">ACC</button>
            </div>`;
    }).join('');
});

window.accLamaran = async (uid, name, docId) => {
    const gaji = prompt("Beri Gaji/Komisi (Contoh: 75%):");
    if(!gaji) return;

    await addDoc(collection(db, "contracts"), {
        uid: uid, candidateName: name, salary: gaji, status: "OFFERED"
    });
    
    await deleteDoc(doc(db, "applications", docId));
    alert("Kontrak Terkirim ke User!");
};
