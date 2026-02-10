import { supabase, auth, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// Ambil ID Tiket dari URL (Misal: ticket.html?id=123)
const urlParams = new URLSearchParams(window.location.search);
const ticketId = urlParams.get('id');

onAuthStateChanged(auth, async (user) => {
    if (user && ticketId) {
        initTicket();
        subscribeToChat(); // Aktifkan real-time chat
    } else if (!user) {
        window.location.href = "index.html";
    }
});

async function initTicket() {
    // 1. Ambil Detail Tiket
    const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

    if (ticket) {
        document.getElementById('projectTitle').innerText = ticket.product_name;
        if (ticket.worker_id) {
            document.getElementById('workerName').innerText = ticket.worker_name;
            document.getElementById('workerStatus').innerText = `Status: ${ticket.worker_status}`;
            document.getElementById('workerAvatar').innerText = ticket.worker_name[0].toUpperCase();
            document.getElementById('statusDot').className = "w-2 h-2 rounded-full bg-green-500";
        }
    }
}

// Fitur Chat (Simpan ke tabel 'ticket_chats')
window.sendMessage = async () => {
    const msg = document.getElementById('chatMsg').value;
    const user = auth.currentUser;
    if (!msg.trim()) return;

    const { error } = await supabase.from('ticket_chats').insert([{
        ticket_id: ticketId,
        sender_id: user.uid,
        sender_name: user.displayName,
        message: msg
    }]);

    if (!error) {
        document.getElementById('chatMsg').value = "";
        // Log ke discord jika buyer yang chat (Opsional)
        if (msg.toLowerCase().includes("urgent")) {
            sendDiscordLog("💬 Chat Penting", `Buyer **${user.displayName}**: ${msg}`);
        }
    }
};

// Real-time Chat menggunakan Supabase Realtime
function subscribeToChat() {
    supabase
        .channel('any')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_chats', filter: `ticket_id=eq.${ticketId}` }, 
        payload => {
            renderMessage(payload.new);
        })
        .subscribe();
}

function renderMessage(data) {
    const box = document.getElementById('chatBox');
    const isMe = data.sender_id === auth.currentUser.uid;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMe ? 'buyer-msg' : 'worker-msg'}`;
    bubble.innerText = data.message;
    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
}
