import { supabase, auth, sendDiscordLog } from './config.js';

const urlParams = new URLSearchParams(window.location.search);
const ticketId = urlParams.get('id');
let user = null;

// 1. Inisialisasi & Cek Auth
auth.onAuthStateChanged(async (u) => {
    if (!u) return window.location.href = 'index.html';
    user = u;
    initTicketInfo();
    loadMessages();
    subscribeMessages();
});

// 2. Load Detail Tiket & Kirim Pesan Bot Awal
async function initTicketInfo() {
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
    if (ticket) {
        document.getElementById('headerTicketName').innerText = ticket.product_name;
        if(ticket.worker_name) {
            document.getElementById('headerWorkerName').innerText = ticket.worker_name;
            document.getElementById('workerStatusCircle').classList.replace('bg-gray-600', 'bg-green-500');
        }
        
        // Cek jika pesan bot sudah ada, kalau belum kirim
        const { data: msgs } = await supabase.from('ticket_messages').select('id').eq('ticket_id', ticketId).eq('is_bot', true);
        if (msgs.length === 0) {
            sendBotMsg("Sistem: Pesanan diterima! Silakan tunggu Worker mengambil project ini. Lakukan pembayaran hanya ke nomor yang tertera nanti.");
        }
    }
}

// 3. Fungsi Kirim Chat
window.sendMsg = async () => {
    const input = document.getElementById('msgInput');
    const msg = input.value.trim();
    if (!msg) return;

    await supabase.from('ticket_messages').insert([{
        ticket_id: ticketId,
        sender_id: user.uid,
        sender_name: user.displayName,
        message: msg
    }]);
    input.value = "";
};

// 4. Fungsi Upload Bukti Payment (Base64)
window.uploadPayment = async (input) => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result;
        await supabase.from('ticket_messages').insert([{
            ticket_id: ticketId,
            sender_id: user.uid,
            sender_name: user.displayName,
            message: base64Data,
            is_image: true
        }]);
        sendBotMsg("Sistem: Bukti pembayaran terkirim! Worker akan segera melakukan verifikasi.");
        sendDiscordLog("💰 Payment Masuk", `User **${user.displayName}** mengirim bukti transfer di tiket ${ticketId}`);
    };
    reader.readAsDataURL(file);
};

// 5. Bot Auto-Message
async function sendBotMsg(text, isSecurity = false) {
    await supabase.from('ticket_messages').insert([{
        ticket_id: ticketId,
        sender_name: isSecurity ? "SECURITY BOT" : "SYSTEM BOT",
        message: text,
        is_bot: true
    }]);
}

// 6. Real-time Subscription (Agar Chat Muncul Tanpa Refresh)
function subscribeMessages() {
    supabase.channel('custom-all-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` }, payload => {
        renderSingleMessage(payload.new);
    }).subscribe();
}

// 7. Render Chat ke UI
function renderSingleMessage(m) {
    const chatBox = document.getElementById('chatBox');
    const isMe = m.sender_id === user.uid;
    
    let content = m.is_image ? `<img src="${m.message}" class="rounded-lg max-w-[200px] border border-gray-700">` : `<p>${m.message}</p>`;
    
    let html = "";
    if (m.is_bot) {
        const theme = m.sender_name.includes("SECURITY") ? "security-msg" : "bot-msg";
        html = `<div class="p-3 rounded-2xl ${theme} text-[11px] mx-auto max-w-[90%] text-center italic text-gray-300">${m.message}</div>`;
    } else {
        html = `
            <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                <div class="${isMe ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-[#252525] text-gray-200 rounded-r-2xl rounded-tl-2xl'} p-3 max-w-[80%] shadow-lg">
                    <p class="text-[9px] font-black opacity-50 mb-1 uppercase">${m.sender_name}</p>
                    <div class="text-sm">${content}</div>
                </div>
            </div>`;
    }
    
    chatBox.innerHTML += html;
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function loadMessages() {
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    document.getElementById('chatBox').innerHTML = "";
    data.forEach(m => renderSingleMessage(m));
}
