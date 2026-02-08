import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- 1. CONFIG FIREBASE (SUDAH DIPERBAIKI) ---
const firebaseConfig = {
    apiKey: "AIzaSyBB9qHDl1szIdcd9KsC_-bQIiXKW6CO2t8",
    
    // 👇 BAGIAN INI SANGAT PENTING AGAR LOGIN HP JALAN 👇
    authDomain: "digital-store-fikri.biz.id", 
    // 👆 JANGAN DIGANTI LAGI KE FIREBASEAPP.COM 👆
    
    projectId: "fs-shop-19c97",
    storageBucket: "fs-shop-19c97.firebasestorage.app",
    messagingSenderId: "1000337517535",
    appId: "1:1000337517535:web:02716f16224d55c97b726a",
    measurementId: "G-3BPL1EZLCX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- 2. SISTEM ENKRIPSI WEBHOOK (AMANKAN DARI MALING) ---
const _0xSec = "ITM5ISXWEhhWGGPVqYifw6MhMTIh6LOvK4rWITM0ISEzNCFKaRAhMTAhlYuhYle+RCUhMTAhSLwYlttNrz0bkFUS5aeexz7WWiExMCH7Jt5BJiExMSHa2pXtJNsTKbXm6oBohcd7dqYSxex3dGfbUJgmkW95adESSsN7BXZEu/SPSFWUvK8hMTMhUAhFdQR1OxX18qP5WuAhMzMhJC0VmECVcAVRpgMvn94pT5+UAaUhMTEhKR6qN8bCw6o/485Qt1Xr5KP2f89GITE2MCExvQLI2eKwo974dsI+3cfrmUJLSPsQxA==";

const _0xDec = (_0xStr) => {
    try {
        return atob(_0xStr.split("").reverse().join(""));
    } catch (e) { return null; }
};

// --- 3. HELPER FUNCTIONS ---

export const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

export const sendDiscordLog = async (title, description, color = 3447003, fields = []) => {
    const _0xUrl = _0xDec(_0xSec); 
    
    if (!_0xUrl || !_0xUrl.startsWith("http")) {
        return;
    }

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
    } catch (e) { 
        // Silent error
    }
};
