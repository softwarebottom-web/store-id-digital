import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// --- FIREBASE CONFIG (Tetap untuk Login Discord) ---
const firebaseConfig = {
    apiKey: "AIzaSyBB9qHDl1szIdcd9KsC_-bQIiXKW6CO2t8",
    authDomain: "fs-shop-19c97.firebaseapp.com",
    projectId: "fs-shop-19c97",
    storageBucket: "fs-shop-19c97.firebasestorage.app",
    messagingSenderId: "1000337517535",
    appId: "1:1000337517535:web:02716f16224d55c97b726a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// --- SUPABASE CONFIG (Database Baru Anda) ---
const SUPABASE_URL = "https://glopkjrxhvjoievsbkam.supabase.co";
const SUPABASE_KEY = "sb_publishable_OubsnX3NpiV3rdTbZZhxBw_9eSETetm";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- HELPER FUNCTIONS ---
export const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

// Webhook Discord Terenkripsi
const _0xSec = "MyExMyHpvB65KeXT2X4sPtnyyRb9nhnJwMAHEbtSJgi+WolgfuxqmstVec4O19+Ij2epTQKLRE5QXxRgc4s1swghMzMhjAIlA41JlFb7p4mxuMZmX5uqITkhFyEzOSGLK5N6yBnUO2G2A1YDkJISiuy1INkakWs+A8tUPwEQdn+W7ijxh0Hnmaw0cw==";
const _0xDec = (s) => atob(s.split("").reverse().join(""));

export const sendDiscordLog = async (title, desc, color = 3447003) => {
    const url = _0xDec(_0xSec);
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "FSF System",
                embeds: [{ title, description: desc, color, footer: { text: "FSF SHOP" }, timestamp: new Date() }]
            })
        });
    } catch (e) { console.error("Webhook Error"); }
};
