import { auth, db, sendDiscordLog } from './config.js';
import { 
    signInWithRedirect, 
    getRedirectResult, 
    OAuthProvider,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- 1. INISIALISASI PROVIDER ---
const provider = new OAuthProvider('discord.com');
provider.addScope('identify');
provider.addScope('email');

// --- 2. CEK APAKAH USER BARU BALIK DARI DISCORD? ---
// Fungsi ini berjalan otomatis saat halaman index.html dimuat
getRedirectResult(auth)
    .then(async (result) => {
        if (result) {
            // User berhasil login dan kembali ke sini
            const user = result.user;
            console.log("Login Berhasil:", user.displayName);

            // Cek Database
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // Register User Baru
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    role: "BUYER",
                    joinedAt: serverTimestamp()
                });

                // Log ke Discord
                sendDiscordLog(
                    "👤 Member Baru", 
                    `Selamat datang **${user.displayName}**!`, 
                    3066993 // Hijau
                );
            }

            // Lempar ke Halaman Peraturan
            window.location.href = "peraturan.html";
        }
    })
    .catch((error) => {
        console.error("Error Redirect:", error);
        // Jangan alert error jika user cuma refresh halaman biasa
        if (error.code !== 'auth/popup-closed-by-user') {
            // alert("Login Gagal: " + error.message);
        }
    });

// --- 3. CEK JIKA SUDAH LOGIN SEBELUMNYA ---
// Jika user refresh halaman index tapi posisinya sudah login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Langsung lempar ke dashboard/peraturan agar tidak stuck di login
        // window.location.href = "peraturan.html"; 
        // (Opsional: Aktifkan baris di atas jika mau auto-redirect kalau sudah login)
    }
});

// --- 4. FUNGSI TOMBOL LOGIN (DIPANGGIL DI HTML) ---
window.loginWithDiscord = () => {
    // Gunakan Redirect, BUKAN Popup
    signInWithRedirect(auth, provider);
};
