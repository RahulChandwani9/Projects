let colours=["blue","yellow","green","red"]
let level=0;
let gamepattern=[];
let userpattern=[];

const pads = document.querySelectorAll('.pad');

// let blue=document.querySelector('.blue')
// let yellow=document.querySelector('.yellow')
// let green=document.querySelector('.green')
// let red=document.querySelector('.red')

function addcolour(){
    let randomIndex=Math.floor(Math.random()*4)
    let randomColor=colours[randomIndex]
    gamepattern.push(randomColor)
}

let canClick = false;

function flashPattern() {
    canClick = false;

    gamepattern.forEach((color, index) => {
        setTimeout(() => {
            let pad = document.querySelector("." + color);

            pad.classList.add("active");

            setTimeout(() => {
                pad.classList.remove("active");
            }, 300);

        }, index * 600);
    });

    setTimeout(() => {
        canClick = true;
    }, gamepattern.length * 600);
}

let lev=document.querySelector('#level')
let sc=document.querySelector('#score')

function start() {
    level++;              
    userpattern = [];      
    addcolour();          
    flashPattern(); 
    lev.textContent=level;       
}
let score=0;

pads.forEach(pad => {
    pad.addEventListener("click", handleUserClick);
});

function handleUserClick() {
    if (!canClick) return;  

    let color = this.classList[1];
    userpattern.push(color);

    flashUser(color);
    checkUserInput();
}

function flashUser(color) {
    let pad = document.querySelector("." + color);
    pad.classList.add("active");
    score++;
    sc.textContent=score

    setTimeout(() => {
        pad.classList.remove("active");
    }, 150);
}
function checkUserInput() {
    let index = userpattern.length - 1;

    if (userpattern[index] !== gamepattern[index]) {
        gameOver();
        return;
    }

    if (userpattern.length === gamepattern.length) {
        setTimeout(() => {
            start();
        }, 1000);
    }
}
function gameOver() {
    alert("Game Over!");
    level = 0;
    gamepattern = [];
    userpattern = [];
    canClick = false;
    lev.textContent=" "
    sc.textContent=" "
}










