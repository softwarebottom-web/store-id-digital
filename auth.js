import { auth, db, sendDiscordLog } from './config.js';
import { 
    signInWithPopup, 
    OAuthProvider, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- [PENTING] AUTO-REDIRECT JIKA SUDAH LOGIN ---
// Mencegah user login ulang saat balik ke biz.id
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Sesi aktif ditemukan:", user.displayName);
        // Jika sudah login, langsung pindah ke dashboard
        window.location.href = "dashboard.html";
    } else {
        // Jika belum login, sembunyikan loading overlay (jika ada)
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.style.display = 'none';
    }
});

// --- FUNGSI LOGIN DISCORD (OIDC) ---
window.loginWithDiscord = async () => {
    const provider = new OAuthProvider('oidc.oidc'); 
    
    // Scopes wajib agar data email & identify masuk
    provider.addScope('openid');
    provider.addScope('email');
    provider.addScope('identify');

    try {
        // Gunakan Popup agar tidak kena blokir lintas domain di HP
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log("Login OIDC Berhasil:", user.displayName);

        // Referensi Dokumen User di Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // Jika user belum terdaftar di database kita
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email || "No Email",
                displayName: user.displayName,
                role: "BUYER", // Default role
                joinedAt: serverTimestamp()
            });
            
            // 🔥 Kirim Log ke Discord via Webhook (Config Baru)
            sendDiscordLog(
                "👤 Member Baru", 
                `User **${user.displayName}** baru saja bergabung!`, 
                3066993
            );
        } else {
            // Jika user lama balik lagi, kirim log login saja (opsional)
            sendDiscordLog(
                "🔑 User Login", 
                `**${user.displayName}** kembali online.`, 
                15105570
            );
        }

        // Arahkan ke peraturan setelah login pertama kali/sukses
        window.location.href = "peraturan.html";

    } catch (error) {
        console.error("Login Error:", error);
        
        if (error.code === 'auth/popup-blocked') {
            alert("⚠️ Popup terblokir! Izinkan popup di browser Anda agar bisa login.");
        } else if (error.code === 'auth/cancelled-popup-request') {
            console.log("Popup ditutup oleh user.");
        } else {
            alert("Gagal Login: " + error.message);
        }
    }
};
