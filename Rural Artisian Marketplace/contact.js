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

setTimeout(typeMessage, 2000);


// <script>
// 	if (!document.querySelector('#ftmwzfgx6')) {
// 		var newDiv = document.createElement('div');
// 		newDiv.setAttribute('key', 'Translator Dropdown');
// 		newDiv.setAttribute('class', 'ft');
// 		newDiv.setAttribute('id', 'ftmwzfgx6');
// 		var newScript = document.createElement('script');
// 		newScript.setAttribute('src', 'https://wdg.fouita.com/widgets/0x3b2d5e.js');
// 		newDiv.appendChild(newScript);

// 		document.body.appendChild(newDiv);
// 	}
// </script>