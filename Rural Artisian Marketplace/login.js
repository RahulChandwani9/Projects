const sendOtpBtn= document.querySelector("#sendOtp");
const phoneNoInput= document.querySelector("#phoneNo");
const formContent= document.querySelector("#form-content")
sendOtpBtn.addEventListener('click',sendOtp);
function sendOtp()
{
    if(phoneNoInput.value!="" && phoneNoInput.value.length===10 )
    {
        console.log(phoneNoInput.value.length);generateOtpInputs();}
    else
    {
        alert("Enter phone number")
    }
    
}
function generateOtpInputs() {

    let div = document.createElement('div');
    div.setAttribute('id', 'otpInputContainer');
    let boxes = [];

    for (let i = 0; i < 4; i++) {
        let box = document.createElement("input");
        box.type = "text";              
        box.maxLength = 1;              
        box.className = "otpInput";
        box.inputMode = "numeric";     

        div.appendChild(box);
        boxes.push(box);
    }


    let verifyButton = document.createElement('button');
    verifyButton.textContent = "Verify OTP";
    verifyButton.setAttribute('class', 'btn');
    verifyButton.setAttribute('id', 'verifyBtn');

   
    formContent.textContent="";
    let h2= document.createElement("h2");
    h2.textContent="Enter OTP";
    formContent.appendChild(h2);
    formContent.appendChild(div);
    div.appendChild(verifyButton);

    verifyButton.addEventListener('click', verifyOtp);

    boxes.forEach((box, index) => {
        box.addEventListener("input", (e) => {
            box.value = box.value.replace(/[^0-9]/g, "");

            if (box.value && index < boxes.length - 1) {
                boxes[index + 1].focus();
            }
        });

        box.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !box.value && index > 0) {
                boxes[index - 1].focus();
            }
        });
    });

    boxes[0].focus();
}

function verifyOtp()
{
    alert("OTP verified successfulyy!");
    //redirect to home page
    window.location.href="rural.html";

}

document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault(); // stop default behavior

        // If Send OTP button exists → click it
        const sendOtpBtn = document.querySelector("#sendOtp");
        if (sendOtpBtn) {
            sendOtpBtn.click();
            return;
        }

        // If Verify OTP button exists → click it
        const verifyBtn = document.querySelector("#verifyBtn");
        if (verifyBtn) {
            verifyBtn.click();
        }
    }
});