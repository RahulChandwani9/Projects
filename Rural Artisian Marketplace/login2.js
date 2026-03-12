const loginBtn = document.querySelector("#loginBtn");
const phoneInput = document.querySelector("#phoneNo");
const passwordInput = document.querySelector("#password");
const errorMsg = document.querySelector("#errorMsg");

loginBtn.addEventListener("click", async function(){

    const phone = phoneInput.value;
    const password = passwordInput.value;

    if(phone === "" || password === ""){
        errorMsg.textContent = "Please enter phone number and password";
        return;
    }

    try{

        const response = await fetch("http://localhost:5000/login",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                phone:phone,
                password:password
            })
        });

        const data = await response.json();

        if(data.success){
            window.location.href = "rural.html";
        }
        else{
            errorMsg.textContent = data.message;
        }

    }
    catch(error){
        errorMsg.textContent = "Server not reachable";
    }

});