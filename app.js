// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 1. SECURITY SYSTEM (IP, Maintenance, & Banned User) ---
async function checkSecurity(user) {
    try {
        // A. Cek Maintenance Mode Global
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            // Jika maintenance aktif DAN bukan di halaman owner
            if (data.maintenance === true && !window.location.href.includes('halamanowner.html')) {
                document.body.innerHTML = `
                    <div style="height:100vh;background:black;color:red;display:flex;justify-content:center;align-items:center;flex-direction:column;font-family:monospace;">
                        <h1 style="font-size:3rem;">SYSTEM LOCKED</h1>
                        <p>Maintenance Mode Active.</p>
                    </div>`;
                throw new Error("MAINTENANCE");
            }
        }

        // B. Cek IP Banned (Client Side)
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipJson = await ipRes.json();
        const myIp = ipJson.ip;
        
        const bannedQ = query(collection(db, "banned_ips"), where("ip", "==", myIp));
        const bannedSnap = await getDocs(bannedQ);
        
        if (!bannedSnap.empty) {
            document.body.innerHTML = "<h1 style='color:red;text-align:center;margin-top:20%;font-family:monospace'>ACCESS DENIED: IP BANNED PERMANENTLY</h1>";
            throw new Error("IP_BANNED");
        }

        // C. Cek Akun Banned (Database User)
        if (user) {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists() && userSnap.data().isBanned === true) {
                // Jika user kena ban, lempar ke ban.html (kecuali sudah disana atau di unban.html)
                if (!window.location.href.includes('ban.html') && !window.location.href.includes('unban.html')) {
                    window.location.href = 'ban.html';
                    throw new Error("USER_BANNED");
                }
            }
        }

        return myIp; // Return IP untuk disimpan di database user
    } catch (e) {
        console.error("Security Check:", e);
        return null;
    }
}

// Jalankan cek awal (tanpa user)
checkSecurity(null);

// --- 2. AUTHENTICATION ---
window.handleLogin = async () => {
    try {
        await signInWithPopup(auth, provider);
        // Redirect ditangani oleh listener onAuthStateChanged
    } catch (error) {
        alert("Login Gagal: " + error.message);
    }
};

window.handleLogout = () => {
    signOut(auth).then(() => window.location.href = 'index.html');
};

// --- 3. AUTH STATE LISTENER (CORE LOGIC) ---
onAuthStateChanged(auth, async (user) => {
    // A. JIKA LOGIN
    if (user) {
        // Cek Security (termasuk apakah user dibanned)
        const ip = await checkSecurity(user);

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        let role = 'buyer';

        if (userSnap.exists()) {
            // User Lama
            const data = userSnap.data();
            role = data.role;
            
            // Update data login
            await setDoc(userRef, { 
                lastIp: ip, 
                lastLogin: serverTimestamp(),
                email: user.email // Pastikan email selalu update
            }, { merge: true });

        } else {
            // User Baru
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'buyer',
                isRebuyer: false,
                storeName: '',
                lastIp: ip,
                createdAt: serverTimestamp(),
                isBanned: false
            });
        }

        // B. REDIRECT SYSTEM
        // Jika di halaman Login (index.html), pindahkan sesuai role
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            if (role === 'owner') window.location.href = 'halamanowner.html';
            else window.location.href = 'market.html';
        }

        // C. PROTEKSI HALAMAN (Role Guard)
        const path = window.location.pathname;
        
        // Proteksi Halaman Owner
        if (path.includes('halamanowner.html') && role !== 'owner') {
            window.location.href = 'market.html';
        }
        
        // Proteksi Halaman Seller
        if (path.includes('sellerpanel.html') && role !== 'seller') {
            alert("Akses Ditolak: Anda bukan Seller.");
            window.location.href = 'market.html';
        }

        // D. UI UPDATE
        const uInfo = document.getElementById('user-info');
        if (uInfo) uInfo.innerText = user.displayName;

    } 
    // E. JIKA TIDAK LOGIN
    else {
        const path = window.location.pathname;
        // Izinkan akses hanya ke index, ban, dan unban tanpa login
        if (!path.endsWith('index.html') && path !== '/' && !path.includes('ban.html')) {
            window.location.href = 'index.html';
        }
    }
});

// --- 4. HELPER: IMAGE COMPRESSOR (Untuk Tiket Tanpa Storage) ---
// Fungsi ini diexport agar bisa dipakai di ticket.html
export const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Resize: Max Lebar 500px (Agar database tidak berat)
                const maxWidth = 500;
                const scaleFactor = maxWidth / img.width;
                
                canvas.width = maxWidth;
                canvas.height = img.height * scaleFactor;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convert ke Base64 (Format JPEG kualitas 70%)
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
        reader.onerror = error => reject(error);
    });
}
