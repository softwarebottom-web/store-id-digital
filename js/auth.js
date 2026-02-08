import { auth, db, sendDiscordLog } from './config.js';
import { signInWithPopup, OAuthProvider } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

window.loginWithDiscord = async () => {
    const provider = new OAuthProvider('discord.com');
    provider.addScope('identify');
    provider.addScope('email');

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Cek User di Database
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // User Baru Register
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                role: "BUYER",
                joinedAt: serverTimestamp()
            });

            // Log Discord
            sendDiscordLog(
                "👤 Member Baru", 
                `Selamat datang **${user.displayName}**!`, 
                3066993 // Warna Hijau
            );
        }

        window.location.href = "peraturan.html";

    } catch (error) {
        alert("Login Gagal: " + error.message);
        console.error(error);
    }
};
