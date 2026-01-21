// security.js
console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold;");
console.log("%cIni adalah fitur browser untuk developer. Jika seseorang menyuruh Anda menyalin-tempel sesuatu di sini, itu adalah penipuan.", "font-size: 16px;");

// Blokir Klik Kanan
document.addEventListener('contextmenu', event => event.preventDefault());

// Blokir Shortcut Developer Tools
document.onkeydown = function(e) {
    if(event.keyCode == 123) { // F12
        return false;
    }
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) { // Ctrl+Shift+I
        return false;
    }
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) { // Ctrl+Shift+C
        return false;
    }
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) { // Ctrl+Shift+J
        return false;
    }
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) { // Ctrl+U
        return false;
    }
}

// Deteksi DevTools terbuka (Advanced)
const devtools = { isOpen: false, orientation: undefined };
const threshold = 160;
const emitEvent = (isOpen, orientation) => {
    // Jika user memaksa buka devtools, kita bisa redirect atau kosongkan body
    if(isOpen) {
        document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top:20%;">ILLEGAL ACCESS DETECTED<br>SYSTEM LOCKED</h1>';
    }
};

setInterval(() => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    const orientation = widthThreshold ? 'vertical' : 'horizontal';

    if (!(heightThreshold && widthThreshold) && ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
        if (!devtools.isOpen || devtools.orientation !== orientation) {
            emitEvent(true, orientation);
        }
        devtools.isOpen = true;
    } else {
        devtools.isOpen = false;
    }
}, 500);
