import { auth, db, sendDiscordLog } from './config.js';
// Gunakan signInWithPopup agar stabil di lintas domain
import { signInWithPopup, OAuthProvider } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

window.loginWithDiscord = async () => {
    // 🔥 PANGGIL OIDC SESUAI SCREENSHOT FIREBASE ANDA
    // Format: 'oidc.' + 'NamaProviderDiConsole'
    const provider = new OAuthProvider('oidc.oidc'); 
    
    // Scopes wajib untuk OIDC Discord
    provider.addScope('openid');
    provider.addScope('email');
    provider.addScope('identify');

    try {
        // Gunakan Popup (Jendela kecil)
        // Ini solusi anti-404 dan anti-data-hilang di HP
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log("Login OIDC Berhasil:", user.displayName);

        // Cek Database & Simpan User
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                role: "BUYER",
                joinedAt: serverTimestamp()
            });
            
            // Kirim Log ke Discord
            sendDiscordLog("👤 Member Baru", `Welcome **${user.displayName}**!`, 3066993);
        }

        // Pindah ke Halaman Peraturan setelah login sukses
        window.location.href = "peraturan.html";

    } catch (error) {
        console.error("Login Error:", error);
        
        // Handle jika popup diblokir browser
        if (error.code === 'auth/popup-blocked') {
            alert("⚠️ Popup Login terblokir! Tolong izinkan popup di browser Anda atau gunakan browser lain (Chrome).");
        } else {
            alert("Gagal Login: " + error.message);
        }
    }
};
