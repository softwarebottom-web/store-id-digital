import { auth, db, supabase, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- 1. AUTH & ROLE PROTECTION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Cek Role Worker di Firestore agar Panel tidak bocor
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && (snap.data().role === "WORKER" || snap.data().role === "OWNER")) {
            loadAvailableProjects();
            loadMyProjects(user.uid);
        } else {
            window.location.href = "dashboard.html";
        }
    } else { 
        window.location.href = "index.html"; 
    }
});

// --- 2. LOAD PROJECT TERSEDIA (SUPABASE) ---
async function loadAvailableProjects() {
    const container = document.getElementById('availableProjects');
    
    // Pastikan narik data yang statusnya OPEN dan worker_id masih NULL
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .is('worker_id', null)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });

    if (error) return console.error("Error Load:", error.message);

    container.innerHTML = tickets.length ? tickets.map(t => `
        <div class="bg-[#1a1a1a] p-5 rounded-3xl border border-gray-800 border-l-4 border-l-blue-600 shadow-xl mb-4 transition-all hover:scale-[1.02]">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-white text-sm">${t.product_name}</h4>
                    <p class="text-[9px] text-gray-500 uppercase font-black mt-1">Customer: ${t.buyer_name}</p>
                </div>
                <button onclick="claimProject('${t.id}', '${t.product_name}')" 
                    class="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-5 py-2.5 rounded-2xl font-black shadow-lg shadow-blue-900/40 active:scale-95 transition-all">
                    AMBIL
                </button>
            </div>
        </div>
    `).join('') : `
        <div class="text-center py-14 opacity-40">
            <i class="fa-solid fa-box-open text-4xl mb-3"></i>
            <p class="text-[10px] font-bold uppercase tracking-widest">Belum ada orderan masuk</p>
        </div>`;
}

// --- 3. FUNGSI KLAIM PROJECT (UPDATE STATUS & BOT) ---
window.claimProject = async (id, productName) => {
    const user = auth.currentUser;
    if(!confirm(`Yakin mau ambil project ${productName}?`)) return;

    try {
        // A. Update Tiket di Supabase (Isi Worker ID & Name)
        const { error: ticketErr } = await supabase
            .from('tickets')
            .update({ 
                worker_id: user.uid, 
                worker_name: user.displayName,
                worker_status: 'On Process',
                status: 'PROCESS' // Ubah status global jadi PROCESS
            })
            .eq('id', id);

        if (ticketErr) throw ticketErr;

        // B. BOT OTOMATIS (KEAMANAN PAYMENT)
        const officialPayment = `⚠️ **SECURITY ALERT - FSF SHOP**\n\nProject ini telah diambil oleh Worker: **${user.displayName}**.\n\n💳 **REKENING RESMI:**\n- GOPAY: 6285137316636 (A/N OWNER)\n- DANA: 6287774246390 (A/N OWNER)\n\n❗ **DILARANG** melakukan transaksi di luar nomor tersebut. Segala bentuk penipuan oleh worker yang meminta TF ke nomor pribadi akan berakibat BANNED permanen.`;
        
        await supabase.from('ticket_messages').insert([{
            ticket_id: id,
            sender_name: "SYSTEM SECURITY",
            message: officialPayment,
            is_bot: true
        }]);

        // C. Discord Logging & Alert
        sendDiscordLog("🛠️ Project Taken", `Worker **${user.displayName}** mengambil: **${productName}**`, 3447003);
        alert("Berhasil! Silahkan kerjakan dengan teliti.");
        location.reload();

    } catch (err) {
        alert("Gagal klaim: " + err.message);
    }
};

// --- 4. LOAD MY PROJECTS (PEKERJAAN SAYA) ---
async function loadMyProjects(uid) {
    const container = document.getElementById('myProjects');
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('worker_id', uid)
        .neq('status', 'CLOSED')
        .order('created_at', { ascending: false });

    if (error) return;

    container.innerHTML = tickets.length ? tickets.map(t => `
        <div class="bg-[#1a1a1a]/60 p-4 rounded-3xl border border-gray-800 mb-3 flex justify-between items-center group hover:border-blue-500/30 transition-all">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                    <i class="fa-solid fa-code-branch"></i>
                </div>
                <div>
                    <h4 class="font-bold text-sm text-white">${t.product_name}</h4>
                    <p class="text-[8px] text-blue-400 font-black uppercase tracking-widest"><i class="fa-solid fa-spinner fa-spin mr-1"></i> ${t.worker_status}</p>
                </div>
            </div>
            <button onclick="window.location.href='ticket.html?id=${t.id}'" class="bg-blue-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 active:scale-90 transition-all">
                <i class="fa-solid fa-comments text-xs"></i>
            </button>
        </div>
    `).join('') : `<p class="text-gray-700 text-[10px] text-center italic py-4">Belum ada project yang dikerjakan.</p>`;
}
