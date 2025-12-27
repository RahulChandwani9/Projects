let words= [
    { word: "planet", hint: "Orbits a star" },
    { word: "rocket", hint: "Space travel vehicle" },
    { word: "puzzle", hint: "Brain teaser" },
    { word: "ocean", hint: "Covers 70% of Earth" },
    { word: "mountain", hint: "Tall natural elevation" },
    { word: "keyboard", hint: "Type using this" },
    { word: "monitor", hint: "Displays computer output" },
    { word: "mouse", hint: "Computer pointing device" },
    { word: "printer", hint: "Prints documents" },
    { word: "cable", hint: "Connects devices" },
    { word: "algorithm", hint: "Step-by-step instructions" },
    { word: "function", hint: "Reusable code block" },
    { word: "variable", hint: "Stores data in code" },
    { word: "boolean", hint: "True or false value" },
    { word: "array", hint: "Stores multiple items" },
    { word: "encrypt", hint: "Secure information" },
    { word: "network", hint: "Connects computers" },
    { word: "server", hint: "Provides services on a network" },
    { word: "browser", hint: "Used to surf the web" },
    { word: "database", hint: "Stores structured data" },  
    { word: "syntax", hint: "Rules of coding language" },
    { word: "debug", hint: "Fix programming errors" },
    { word: "compile", hint: "Convert code to machine language" },
    { word: "variable", hint: "Holds values in programming" },
    { word: "console", hint: "Used to log messages in JS" }
];

let displayword=document.querySelector('.scrambled-word')
let displayhint=document.querySelector('.hint1')
let userinput=document.querySelector('.userinput')
let check=document.querySelector('.check')
let random,selectedword,hint,scrambledword
let point=0;
let gameOver=false;
let btn=document.querySelector('.start')
let btn2=document.querySelector('.restart')
let score=document.querySelector('.score')

function start(){
    if(gameOver) return;
    random=Math.floor(Math.random()*words.length)
    selectedword=words[random].word
    hint=words[random].hint
    let letters=selectedword.split("")
    let shuffle=letters.sort(()=>Math.random()-0.5)
    scrambledword=shuffle.join('')
    displayword.textContent=scrambledword
    displayhint.textContent=hint
    check.textContent=" "
    userinput.value = ""
}

function decode(){
    let enteredword=userinput.value
    if(enteredword==selectedword){
        point++;
        check.textContent="✅"
        score.textContent=point
        setTimeout(start,1000)
    }
    else{
        check.textContent="❌"
    }
}

let over=document.querySelector('.game-over-popup')
let final=document.querySelector('.final-score')
let timer;
function timeout(){
    let time=document.querySelector('.time')
    let i=45
    time.textContent = i;

    clearInterval(timer);
    gameOver = false;

    timer = setInterval(() => {
        i--;
        time.textContent = i;

        if (i <= 0) {
            clearInterval(timer);
            gameOver = true;
            time.textContent = "⏱ Time’s Up!";
            over.style.display="block"
            final.textContent=point
            check.textContent=" "
            userinput.value = ""
            displayword.textContent=" "
            displayhint.textContent=" "            
        }
    }, 1000);
}
btn.addEventListener('click',()=>{
    point = 0;              
    score.textContent = point; 
    timeout();
    start();
})

btn2.addEventListener('click',()=>{
    over.style.display="none"
    point = 0;              
    score.textContent = point; 
    timeout();
    start();
})