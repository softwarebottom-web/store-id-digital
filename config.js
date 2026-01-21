// config.js
export const firebaseConfig = {
    apiKey: "AIzaSyDKD5TOV9pGrMUtOo6y3HDVtBP66k8vwbQ",
    authDomain: "storeid-87b30.firebaseapp.com",
    projectId: "storeid-87b30",
    storageBucket: "storeid-87b30.firebasestorage.app",
    messagingSenderId: "394072946011",
    appId: "1:394072946011:web:1fcb4c7ddb028fc480967e",
    measurementId: "G-334S73054N"
};

// --- CARA MENDAPATKAN OWNER UID ---
// 1. Jalankan website, login menggunakan Google.
// 2. Buka Firebase Console (https://console.firebase.google.com/)
// 3. Pilih Project "storeid-87b30" -> menu "Authentication" -> tab "Users".
// 4. Salin kode "User UID" milik email Anda.
// 5. Tempel di bawah ini:

export const OWNER_UID = "MASUKKAN_UID_ANDA_DISINI"; 
