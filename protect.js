// js/protect.js

// 1. Blokir Klik Kanan
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    alert("⚠️ AKSES DILARANG: Fitur ini dikunci oleh Admin FSF SHOP.");
});

// 2. Blokir Tombol Pintas (Shortcut) Keyboard
document.onkeydown = function(e) {
    // F12
    if(e.keyCode == 123) {
        return false;
    }
    // Ctrl+Shift+I (Inspect)
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
        return false;
    }
    // Ctrl+Shift+J (Console)
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
        return false;
    }
    // Ctrl+U (View Source)
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
        return false;
    }
    // Ctrl+S (Save Page)
    if(e.ctrlKey && e.keyCode == 'S'.charCodeAt(0)) {
        return false;
    }
}

// 3. Deteksi DevTools Terbuka (Debugger Loop)
// Ini akan membuat browser orang yang maksa buka inspect element jadi hang/lag
setInterval(function() {
    const start = new Date().getTime();
    debugger; // Pemicu breakpoint
    const end = new Date().getTime();
    if (end - start > 100) {
        document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:20%">⚠️ ILEGAL AKSES TERDETEKSI ⚠️<br>IP ANDA TELAH DICATAT SISTEM.</h1>';
        window.location.href = "about:blank"; // Tendang keluar
    }
}, 1000);
