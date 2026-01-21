// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from './config.js'; // Pastikan config.js isinya API KEY Anda

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 1. GLOBAL SECURITY CHECK (Maintenance & Ban IP) ---
async function checkSecurity() {
    try {
        // Cek Setting Global
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            
            // Maintenance Mode Check
            if (data.maintenance === true && !window.location.href.includes('halamanowner.html')) {
                document.body.innerHTML = `
                    <div style="height:100vh;background:black;color:red;display:flex;justify-content:center;align-items:center;flex-direction:column;font-family:monospace;">
                        <h1 style="font-size:3rem;">SYSTEM LOCKED</h1>
                        <p>Maintenance Mode Active.</p>
                    </div>`;
                throw new Error("MAINTENANCE");
            }
        }

        // IP Ban Check (Client Side Layer)
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipJson = await ipRes.json();
        const myIp = ipJson.ip;
        
        const bannedQ = query(collection(db, "banned_ips"), where("ip", "==", myIp));
        const bannedSnap = await getDocs(bannedQ);
        
        if (!bannedSnap.empty) {
            document.body.innerHTML = "<h1 style='color:red;text-align:center;margin-top:20%;'>IP BANNED PERMANENTLY</h1>";
            throw new Error("BANNED");
        }
        
        return myIp;
    } catch (e) {
        console.log("Sec Check:", e);
        return null;
    }
}
checkSecurity();

// --- 2. LOGIN SYSTEM FIX ---
window.handleLogin = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        // Redirect ditangani oleh onAuthStateChanged agar konsisten
    } catch (error) {
        alert("Login Gagal: " + error.message);
    }
};

window.handleLogout = () => {
    signOut(auth).then(() => window.location.href = 'index.html');
};

// --- 3. AUTH STATE LISTENER (THE BRAIN) ---
onAuthStateChanged(auth, async (user) => {
    // A. JIKA USER LOGIN
    if (user) {
        const ip = await checkSecurity();
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let role = 'buyer'; // Default

        if (userSnap.exists()) {
            // User lama: Ambil role yang sudah ada
            role = userSnap.data().role;
            // Update IP dan Last Login
            await setDoc(userRef, { lastIp: ip, lastLogin: serverTimestamp() }, { merge: true });
        } else {
            // User baru: Register sebagai Buyer
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'buyer',
                storeName: '', // Belum punya toko
                lastIp: ip,
                createdAt: serverTimestamp()
            });
        }

        // B. REDIRECT LOGIC (Hanya jika di halaman login/index)
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            if (role === 'owner') window.location.href = 'halamanowner.html';
            else window.location.href = 'market.html';
        }

        // C. PROTEKSI HALAMAN (Privacy Check)
        const path = window.location.pathname;
        if (path.includes('halamanowner.html') && role !== 'owner') window.location.href = 'index.html';
        if (path.includes('sellerpanel.html') && role !== 'seller') {
            alert("Akses Ditolak: Anda bukan Seller.");
            window.location.href = 'market.html';
        }

        // UI Update (Navbar)
        const uInfo = document.getElementById('user-info');
        if (uInfo) uInfo.innerHTML = `Hi, ${user.displayName} (${role})`;

    } 
    // D. JIKA TIDAK LOGIN
    else {
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
});
