import { auth, db, sendDiscordLog } from './config.js';
import { 
    signInWithRedirect, // <--- JANGAN signInWithPopup
    getRedirectResult, 
    OAuthProvider,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- INI SCRIPT PENTING UNTUK MENANGKAP USER SETELAH BALIK DARI DISCORD ---
getRedirectResult(auth)
    .then(async (result) => {
        if (result) {
            const user = result.user;
            
            // Cek & Simpan User ke Database
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
                sendDiscordLog("👤 Member Baru", `Welcome **${user.displayName}**!`, 3066993);
            }

            // Redirect Sukses -> Masuk Peraturan
            window.location.href = "peraturan.html";
        }
    })
    .catch((error) => {
        console.error("Error Redirect:", error);
    });

// --- TOMBOL LOGIN ---
window.loginWithDiscord = () => {
    const provider = new OAuthProvider('discord.com');
    provider.addScope('identify');
    provider.addScope('email');
    
    // GUNAKAN REDIRECT (Cocok untuk HP)
    signInWithRedirect(auth, provider);
};
