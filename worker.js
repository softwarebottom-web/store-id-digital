import { auth, db, supabase, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadAvailableProjects();
        loadMyProjects(user.uid);
        checkWorkerStatus(user.uid);
    } else { window.location.href = "index.html"; }
});

// Load project yang belum ada worker-nya
async function loadAvailableProjects() {
    const container = document.getElementById('availableProjects');
    const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .is('worker_id', null)
        .eq('status', 'OPEN');

    container.innerHTML = tickets.length ? tickets.map(t => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border-l-4 border-blue-500">
            <div>
                <h4 class="font-bold text-sm">${t.product_name}</h4>
                <p class="text-[10px] text-gray-500">Buyer: ${t.buyer_name}</p>
            </div>
            <button onclick="claimProject('${t.id}')" class="bg-blue-600 text-[10px] px-3 py-1.5 rounded-lg font-bold">AMBIL</button>
        </div>
    `).join('') : '<p class="text-gray-600 text-xs">Belum ada orderan masuk.</p>';
}

// Ambil Project
window.claimProject = async (id) => {
    const user = auth.currentUser;
    const { error } = await supabase
        .from('tickets')
        .update({ 
            worker_id: user.uid, 
            worker_name: user.displayName,
            worker_status: 'On Process' 
        })
        .eq('id', id);

    if(!error) {
        sendDiscordLog("🛠️ Project Diambil", `Worker **${user.displayName}** mengambil project: **${id}**`, 3447003);
        alert("Project berhasil diambil!");
        location.reload();
    }
};

// Fitur Izin Libur
window.submitLeave = async () => {
    const dur = document.getElementById('leaveDuration').value;
    const res = document.getElementById('leaveReason').value;
    const user = auth.currentUser;

    if (dur < 2 || dur > 4) return alert("Izin minimal 2 hari & maksimal 4 hari!");

    const { error } = await supabase.from('leave_requests').insert([{
        worker_id: user.uid,
        worker_name: user.displayName,
        duration: dur,
        reason: res,
        status: 'PENDING'
    }]);

    if (!error) {
        sendDiscordLog("📅 Pengajuan Libur", `Worker **${user.displayName}** minta libur **${dur} hari**.\nAlasan: ${res}`, 15105570);
        alert("Permohonan libur dikirim ke Owner!");
        closeLeaveModal();
    }
};

window.openLeaveModal = () => document.getElementById('leaveModal').classList.remove('hidden');
window.closeLeaveModal = () => document.getElementById('leaveModal').classList.add('hidden');
