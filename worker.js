import { auth, db, supabase, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- AUTH & INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadAvailableProjects();
        loadMyProjects(user.uid);
    } else { 
        window.location.href = "index.html"; 
    }
});

// 1. Load project yang belum ada worker-nya (Supabase)
async function loadAvailableProjects() {
    const container = document.getElementById('availableProjects');
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .is('worker_id', null)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });

    if (error) return;

    container.innerHTML = tickets.length ? tickets.map(t => `
        <div class="bg-[#1a1a1a] p-4 rounded-2xl flex justify-between items-center border border-gray-800 border-l-4 border-l-blue-600 shadow-lg mb-3">
            <div>
                <h4 class="font-bold text-sm text-white">${t.product_name}</h4>
                <p class="text-[9px] text-gray-500 uppercase font-black">Buyer: ${t.buyer_name}</p>
            </div>
            <button onclick="claimProject('${t.id}', '${t.product_name}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-4 py-2 rounded-xl font-black transition active:scale-95 shadow-lg shadow-blue-900/20">AMBIL</button>
        </div>
    `).join('') : '<div class="text-center py-10"><i class="fa-solid fa-box-open text-gray-700 text-3xl mb-2"></i><p class="text-gray-600 text-xs italic">Belum ada orderan masuk.</p></div>';
}

// 2. Fungsi Worker Mengambil Project (Klaim)
window.claimProject = async (id, productName) => {
    const user = auth.currentUser;
    if(!confirm(`Ambil project ${productName}?`)) return;

    try {
        // A. Update Status Tiket di Supabase
        const { error: ticketErr } = await supabase
            .from('tickets')
            .update({ 
                worker_id: user.uid, 
                worker_name: user.displayName,
                worker_status: 'On Process' 
            })
            .eq('id', id);

        if (ticketErr) throw ticketErr;

        // B. BOT OTOMATIS KIRIM PESAN KEAMANAN & PAYMENT
        const officialPayment = `
📢 **OFFICIAL PAYMENT FSF SHOP**
GOPAY: 6285137316636 (A/N OWNER)
DANA: 6287774246390 (A/N OWNER)

⚠️ **WARNING:** Jangan pernah kirim uang ke nomor selain di atas. Jika worker menyuruh kirim ke nomor lain, itu ILEGAL. Segera lapor ke Manager/Owner!
        `;
        
        await supabase.from('ticket_messages').insert([{
            ticket_id: id,
            sender_name: "SECURITY BOT",
            message: officialPayment,
            is_bot: true
        }]);

        // C. Log Ke Discord
        sendDiscordLog("🛠️ Project Diambil", `Worker **${user.displayName}** mengambil project: **${productName}**\nID: \`${id}\``, 3447003);
        
        alert("Project berhasil diambil!");
        location.reload();

    } catch (err) {
        alert("Gagal: " + err.message);
    }
};

// 3. Load Project Saya
async function loadMyProjects(uid) {
    const container = document.getElementById('myProjects');
    const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('worker_id', uid)
        .neq('status', 'CLOSED')
        .order('created_at', { ascending: false });

    if (tickets) {
        container.innerHTML = tickets.length ? tickets.map(t => `
            <div class="bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800 mb-3 flex justify-between items-center group hover:border-blue-500/50 transition-all">
                <div>
                    <h4 class="font-bold text-sm text-white">${t.product_name}</h4>
                    <p class="text-[9px] text-blue-500 font-black uppercase mt-1"><i class="fa-solid fa-spinner fa-spin mr-1"></i> ${t.worker_status}</p>
                </div>
                <button onclick="window.location.href='ticket.html?id=${t.id}'" class="bg-blue-600/10 hover:bg-blue-600 p-2 w-10 h-10 rounded-xl transition-all group-hover:scale-110 flex items-center justify-center">
                    <i class="fa-solid fa-comments text-blue-500 group-hover:text-white"></i>
                </button>
            </div>
        `).join('') : '<p class="text-gray-600 text-[10px] text-center italic">Kamu belum mengambil project apapun.</p>';
    }
}

// 4. Fitur Izin Libur (Firestore)
window.submitLeave = async () => {
    const dur = document.getElementById('leaveDuration').value;
    const res = document.getElementById('leaveReason').value;
    const user = auth.currentUser;

    if (!dur || !res) return alert("Isi semua data izin!");
    if (dur < 2 || dur > 4) return alert("Izin minimal 2 hari & maksimal 4 hari!");

    try {
        await addDoc(collection(db, "leave_requests"), {
            worker_id: user.uid,
            worker_name: user.displayName,
            duration: parseInt(dur),
            reason: res,
            status: 'PENDING',
            createdAt: serverTimestamp()
        });

        sendDiscordLog("📅 Pengajuan Libur", `Worker **${user.displayName}** minta libur **${dur} hari**.\nAlasan: ${res}`, 15105570);
        
        alert("Permohonan libur terkirim!");
        closeLeaveModal();
    } catch (e) { alert("Error: " + e.message); }
};

window.openLeaveModal = () => document.getElementById('leaveModal').classList.remove('hidden');
window.closeLeaveModal = () => document.getElementById('leaveModal').classList.add('hidden');
