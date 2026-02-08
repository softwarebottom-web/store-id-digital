import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBB9qHDl1szIdcd9KsC_-bQIiXKW6CO2t8",
    
    // Gunakan firebaseapp.com agar OIDC/Discord handler tidak 404
    authDomain: "fs-shop-19c97.firebaseapp.com", 
    
    projectId: "fs-shop-19c97",
    storageBucket: "fs-shop-19c97.firebasestorage.app",
    messagingSenderId: "1000337517535",
    appId: "1:1000337517535:web:02716f16224d55c97b726a",
    measurementId: "G-3BPL1EZLCX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- SISTEM ENKRIPSI WEBHOOK (SUDAH DIPERBARUI) ---
// Menggunakan string baru yang Anda berikan
const _0xSec = "MyExMyHpvB65KeXT2X4sPtnyyRb9nhnJwMAHEbtSJgi+WolgfuxqmstVec4O19+Ij2epTQKLRE5QXxRgc4s1swghMzMhjAIlA41JlFb7p4mxuMZmX5uqITkhFyEzOSGLK5N6yBnUO2G2A1YDkJISiuy1INkakWs+A8tUPwEQdn+W7ijxh0Hnmaw0cw==";

const _0xDec = (_0xStr) => {
    try {
        // Balikkan string lalu decode Base64
        return atob(_0xStr.split("").reverse().join(""));
    } catch (e) { 
        console.error("Gagal dekripsi Webhook. Pastikan string _0xSec benar.");
        return null; 
    }
};

// --- HELPER FUNCTIONS ---
export const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

export const sendDiscordLog = async (title, description, color = 3447003, fields = []) => {
    const _0xUrl = _0xDec(_0xSec); 
    if (!_0xUrl || !_0xUrl.startsWith("http")) return;

    try {
        await fetch(_0xUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "FSF SHOP System",
                avatar_url: "https://cdn-icons-png.flaticon.com/512/906/906343.png",
                embeds: [{ 
                    title: title, 
                    description: description, 
                    color: color, 
                    fields: fields, 
                    footer: { text: "FSF SHOP • " + new Date().toLocaleString() } 
                }]
            })
        });
    } catch (e) { console.error("Webhook Send Error:", e); }
};
