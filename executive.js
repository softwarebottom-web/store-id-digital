import { supabase, auth, sendDiscordLog } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadHistory();
        subscribeVIP();
    } else { window.location.href = "index.html"; }
});

// Kirim Pesan VIP
window.sendVIPChat = async () => {
    const msg = document.getElementById('vipMsg').value;
    const target = document.getElementById('targetRole').value;
    const user = auth.currentUser;

    if (!msg.trim()) return;

    const { error } = await supabase.from('executive_chats').insert([{
        buyer_id: user.uid,
        buyer_name: user.displayName,
        message: msg,
        target_role: target
    }]);

    if (!error) {
        document.getElementById('vipMsg').value = "";
        // Notifikasi ke Discord dengan mention khusus
        sendDiscordLog(
            `👑 VIP CONSULTATION: ${target}`,
            `**Dari:** ${user.displayName}\n**Pesan:** ${msg}`,
            16766720 // Warna Gold
        );
    }
};

// Realtime Subscriber
function subscribeVIP() {
    supabase
        .channel('executive')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'executive_chats' }, 
        payload => {
            renderVIPChat(payload.new);
        })
        .subscribe();
}

function renderVIPChat(data) {
    const box = document.getElementById('vipChatBox');
    const isMe = data.buyer_id === auth.currentUser.uid;
    
    const div = document.createElement('div');
    div.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;
    div.innerHTML = `
        <div class="${isMe ? 'bg-[#d4af37] text-black' : 'bg-[#1a1a1a] text-gray-300'} px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-md">
            <p class="text-[9px] font-bold uppercase opacity-50 mb-1">${data.buyer_name}</p>
            ${data.message}
        </div>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
