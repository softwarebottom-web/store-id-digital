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

// --- [1] SATPAM OTOMATIS (RE-DIRECT) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Cek dulu apakah data user ini sudah ada di Firestore?
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        // HANYA redirect otomatis jika data Firestore sudah ada (User Lama)
        if (userSnap.exists()) {
            console.log("Sesi aktif & terdaftar. Meluncur ke dashboard...");
            // Jika dia user lama, langsung ke dashboard saja
            window.location.href = "dashboard.html";
        }
    } else {
        // Jika tidak ada user, matikan loading overlay (jika ada)
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.style.display = 'none';
    }
});

// --- [2] FUNGSI LOGIN DISCORD ---
window.loginWithDiscord = async () => {
    const provider = new OAuthProvider('oidc.oidc'); 
    
    provider.addScope('openid');
    provider.addScope('email');
    provider.addScope('identify');

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log("Mencoba login:", user.displayName);

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // Tentukan halaman tujuan awal
        let targetPage = "dashboard.html";

        if (!userSnap.exists()) {
            // --- USER BARU ---
            // Wajib ditunggu (AWAIT) sampai data benar-benar masuk Firestore
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email || "No Email",
                displayName: user.displayName,
                role: "BUYER", 
                joinedAt: serverTimestamp()
            });
            
            // Log ke Discord
            sendDiscordLog("👤 Member Baru", `User **${user.displayName}** baru saja mendaftar!`, 3066993);
            
            // User baru dipaksa ke Peraturan dulu
            targetPage = "peraturan.html";
        } else {
            // --- USER LAMA ---
            sendDiscordLog("🔑 User Login", `**${user.displayName}** masuk kembali.`, 15105570);
            targetPage = "dashboard.html";
        }

        // SETELAH semua urusan database selesai, baru pindahkan halaman
        console.log("Navigasi ke:", targetPage);
        window.location.href = targetPage;

    } catch (error) {
        console.error("Login Gagal:", error);
        
        if (error.code === 'auth/popup-blocked') {
            alert("⚠️ Popup diblokir! Tolong izinkan popup di pengaturan browser kamu.");
        } else if (error.code === 'auth/cancelled-popup-request') {
            console.log("User membatalkan login.");
        } else {
            alert("Terjadi kesalahan: " + error.message);
        }
    }
};
