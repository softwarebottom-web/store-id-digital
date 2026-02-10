import { auth, db, supabase, formatRupiah, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ==========================================
// GLOBAL STATES & PROTEKSI
// ==========================================
let selectedImagesBase64 = [];
let activeVIPBuyer = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'OWNER') { 
            initOwner(); 
        } 
        else { window.location.href = "dashboard.html"; }
    } else { window.location.href = "index.html"; }
});

function initOwner() { 
    loadStats(); 
    loadProducts(); 
    loadApplicants(); 
    checkCareerToggle();
    loadAccounting();
    loadWorkerList();
    loadLeaveLogs();
    subscribeExecutive();
}

// ==========================================
// 1. AKUNTANSI & STATISTIK (SUPABASE)
// ==========================================
async function loadStats() {
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    let total = 0, count = 0, html = "";
    tickets.forEach(data => {
        if (data.status === 'PAID') {
            total += parseInt(data.price);
            count++;
        }
        const statusColor = data.status === 'PAID' ? 'text-green-400' : 'text-yellow-500';
        html += `<tr class="border-b border-gray-800">
                    <td class="p-4">${data.buyer_name}</td>
                    <td class="p-4 text-gray-300">${data.product_name}</td>
                    <td class="p-4 font-mono ${statusColor}">${formatRupiah(data.price)} [${data.status}]</td>
                 </tr>`;
    });

    document.getElementById('totalRev').innerText = formatRupiah(total);
    document.getElementById('totalSales').innerText = count;
    document.getElementById('trxTable').innerHTML = html || '<tr><td colspan="3" class="p-4 text-center">Belum ada transaksi.</td></tr>';
}

async function loadAccounting() {
    const { data: tickets } = await supabase.from('tickets').select('*').eq('status', 'PAID');
    let bruto = 0, workerGaji = 0, performance = {};

    tickets?.forEach(t => {
        bruto += t.price;
        const commission = t.price * 0.3; // Worker fee 30%
        workerGaji += commission;
        if (t.worker_name) {
            performance[t.worker_name] = (performance[t.worker_name] || 0) + t.price;
        }
    });

    document.getElementById('netProfit').innerText = formatRupiah(bruto - workerGaji);
    document.getElementById('totalExpenses').innerText = formatRupiah(workerGaji);
    
    const perfContainer = document.getElementById('workerPerformance');
    perfContainer.innerHTML = Object.entries(performance).map(([name, val]) => `
        <div class="flex justify-between text-xs p-3 bg-white/5 rounded-lg border border-white/5">
            <span class="font-bold text-gray-300">${name}</span>
            <span class="text-green-400 font-mono">${formatRupiah(val)}</span>
        </div>
    `).join('') || '<p class="text-center py-4 text-xs text-gray-600">Belum ada data performa worker.</p>';
}

// ==========================================
// 2. MANAJEMEN WORKER & IZIN (SUPABASE)
// ==========================================
async function loadWorkerList() {
    const { data: workers } = await supabase.from('workers').select('*');
    const container = document.getElementById('workerListContainer');
    document.getElementById('workerCount').innerText = `${workers?.length || 0} Workers`;

    container.innerHTML = workers?.map(w => `
        <div class="p-4 bg-white/5 border border-gray-800 rounded-xl flex justify-between items-center hover:border-accent transition">
            <div>
                <p class="font-bold text-white text-sm">${w.name}</p>
                <p class="text-[9px] ${w.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'} font-bold uppercase">${w.status}</p>
            </div>
            <div class="text-right">
                <p class="text-[9px] text-gray-500 uppercase">Projects</p>
                <p class="text-sm font-mono text-accent font-bold">${w.total_projects}</p>
            </div>
        </div>
    `).join('') || '<p class="text-center text-gray-600 py-10">Belum ada tim worker.</p>';
}

async function loadLeaveLogs() {
    const { data: requests } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('leaveLogsContainer');
    
    container.innerHTML = requests?.map(req => {
        const isPending = req.status === 'PENDING';
        return `
            <div class="p-4 rounded-xl border ${isPending ? 'border-yellow-600/30 bg-yellow-600/5' : 'border-gray-800 bg-white/5'}">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-bold text-white">${req.worker_name}</span>
                    <span class="text-[9px] px-2 py-0.5 rounded font-black ${req.status === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}">${req.status}</span>
                </div>
                <p class="text-[11px] text-gray-400 mb-3 italic">"${req.reason}"</p>
                ${isPending ? `
                    <div class="flex gap-2">
                        <button onclick="handleLeave('${req.id}', '${req.worker_id}', 'APPROVED', ${req.duration})" class="flex-1 py-2 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-500 transition">ACC</button>
                        <button onclick="handleLeave('${req.id}', '${req.worker_id}', 'DECLINED')" class="flex-1 py-2 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-500 transition">TOLAK</button>
                    </div>
                ` : `<p class="text-[9px] text-gray-600 font-bold uppercase tracking-widest">${req.duration} Hari Izin • ${req.status}</p>`}
            </div>
        `;
    }).join('') || '<p class="text-center text-gray-600 py-10 text-xs">History izin kosong.</p>';
}

window.handleLeave = async (id, workerId, status, days = 0) => {
    try {
        await supabase.from('leave_requests').update({ status }).eq('id', id);
        if (status === 'APPROVED') {
            const leaveUntil = new Date();
            leaveUntil.setDate(leaveUntil.getDate() + days);
            await supabase.from('workers').update({ status: 'ON_LEAVE', leave_until: leaveUntil }).eq('uid', workerId);
            sendDiscordLog("📅 IZIN DISETUJUI", `Worker **${workerId}** resmi libur ${days} hari.`, 65280);
        }
        alert("Status izin berhasil diperbarui!");
        loadLeaveLogs(); loadWorkerList();
    } catch (e) { alert(e.message); }
};

// ==========================================
// 3. EXECUTIVE VIP ROOM (REALTIME)
// ==========================================
function subscribeExecutive() {
    supabase.channel('executive_chats').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'executive_chats' }, () => {
        document.getElementById('vipBadge').classList.remove('hidden');
        loadVIPList();
    }).subscribe();
    loadVIPList();
}

async function loadVIPList() {
    const { data } = await supabase.from('executive_chats').select('buyer_id, buyer_name').order('created_at', { ascending: false });
    const unique = [...new Map(data?.map(i => [i.buyer_id, i])).values()];
    const container = document.getElementById('vipUserList');
    container.innerHTML = unique.map(u => `
        <div onclick="selectVIP('${u.buyer_id}', '${u.buyer_name}')" class="p-4 mb-2 rounded-xl border border-gray-800 hover:bg-accent/10 cursor-pointer transition active:scale-95">
            <p class="text-xs font-bold text-white">${u.buyer_name}</p>
            <p class="text-[9px] text-gray-500 font-mono tracking-tighter">${u.buyer_id}</p>
        </div>
    `).join('');
}

window.selectVIP = async (id, name) => {
    activeVIPBuyer = id;
    document.getElementById('activeVIPName').innerText = name;
    document.getElementById('vipBadge').classList.add('hidden');
    const { data: messages } = await supabase.from('executive_chats').select('*').eq('buyer_id', id).order('created_at', { ascending: true });
    
    const display = document.getElementById('vipChatDisplay');
    display.innerHTML = messages.map(m => `
        <div class="flex ${m.target_role === 'OWNER' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[85%] p-3 rounded-2xl ${m.target_role === 'OWNER' ? 'bg-accent text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'} shadow-sm">
                <p class="text-[9px] opacity-50 mb-1 font-bold uppercase">${m.target_role === 'OWNER' ? 'MANAGEMENT' : m.buyer_name}</p>
                <p class="text-xs leading-relaxed">${m.message}</p>
            </div>
        </div>
    `).join('');
    display.scrollTop = display.scrollHeight;
};

window.replyVIP = async () => {
    const msg = document.getElementById('vipReplyMsg').value;
    if (!msg || !activeVIPBuyer) return;
    await supabase.from('executive_chats').insert([{
        buyer_id: activeVIPBuyer, buyer_name: document.getElementById('activeVIPName').innerText,
        message: msg, target_role: 'OWNER'
    }]);
    document.getElementById('vipReplyMsg').value = "";
    selectVIP(activeVIPBuyer, document.getElementById('activeVIPName').innerText);
};

// ==========================================
// 4. PRODUK & HRD (COMPRESSION & LEGACY)
// ==========================================
const compressImage = (base64Str) => {
    return new Promise((resolve) => {
        const img = new Image(); img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > 800) { h *= 800/w; w = 800; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
};

window.handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    selectedImagesBase64 = [];
    if (files.length > 4) { alert("Max 4 foto!"); e.target.value = ""; return; }
    for (const f of files) {
        const reader = new FileReader();
        const promise = new Promise(res => {
            reader.onload = async (ev) => res(await compressImage(ev.target.result));
        });
        reader.readAsDataURL(f);
        selectedImagesBase64.push(await promise);
    }
};

async function loadProducts() {
    const { data: products } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    const list = document.getElementById('productList');
    list.innerHTML = products?.map(p => `
        <div class="bg-panelBg p-4 flex justify-between items-center border border-gray-800 rounded-xl hover:border-accent transition">
            <div class="flex items-center gap-4">
                <img src="${p.images?.[0] || 'https://via.placeholder.com/50'}" class="w-12 h-12 object-cover rounded-lg">
                <div>
                    <p class="font-bold text-sm text-white">${p.name}</p>
                    <p class="text-[10px] text-green-400 font-mono">${formatRupiah(p.price)}</p>
                </div>
            </div>
            <button onclick="delProd('${p.id}')" class="text-red-500 text-[10px] font-black hover:bg-red-500/10 px-3 py-2 rounded-lg transition uppercase">HAPUS</button>
        </div>
    `).join('') || '<p class="text-center text-gray-600 py-10">Kosong.</p>';
}

document.getElementById('addProductForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Processing...";
    try {
        await supabase.from('products').insert([{
            name: document.getElementById('pName').value,
            price: parseInt(document.getElementById('pPrice').value),
            description: document.getElementById('pDesc').value,
            images: selectedImagesBase64
        }]);
        alert("Produk Berhasil di-Publish!"); e.target.reset(); loadProducts();
    } catch (err) { alert(err.message); } 
    finally { btn.disabled = false; btn.innerText = "POST PRODUCT"; }
});

window.delProd = async(id) => {
    if(confirm("Hapus produk?")) { await supabase.from('products').delete().eq('id', id); loadProducts(); }
};

// HRD & TOGGLE
async function checkCareerToggle() {
    const { data } = await supabase.from('settings').select('value').eq('key', 'career_status').single();
    const btn = document.getElementById('btnToggleCareer');
    if (btn) {
        const isOpen = data.value.isOpen;
        btn.innerText = isOpen ? "TUTUP LOWONGAN" : "BUKA LOWONGAN";
        btn.className = `px-6 py-3 rounded-xl text-white font-black transition uppercase text-xs ${isOpen ? 'bg-red-600' : 'bg-green-600'}`;
    }
}

window.toggleCareer = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'career_status').single();
    const newState = !data.value.isOpen;
    await supabase.from('settings').update({ value: { isOpen: newState } }).eq('key', 'career_status');
    alert("Status Karir Diubah!"); checkCareerToggle();
};

async function loadApplicants() {
    // Tetap gunakan Firebase/Firestore untuk data sensitif HRD jika diperlukan
    const list = document.getElementById('applicantList');
    list.innerHTML = '<p class="text-center py-10 text-xs text-gray-600">Fitur HRD sinkron dengan Firestore.</p>';
}

// Global Switch Tab Dispatcher
window.addEventListener('tabChanged', (e) => {
    const tabId = e.detail;
    if(tabId === 'accounting') loadAccounting();
    if(tabId === 'workers') { loadWorkerList(); loadLeaveLogs(); }
    if(tabId === 'executive') loadVIPList();
});
