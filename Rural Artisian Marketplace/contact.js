const message ="👋 Namaste! Need a Help? Chat with us on WhatsApp 🌿";

let i = 0;
const speed = 35;
let type=document.getElementById("typing")

function typeMessage() {
  if (i < message.length) {
    type.textContent += message.charAt(i);
    i++;
    setTimeout(typeMessage, speed);
  }
}

setTimeout(typeMessage, 1000);
