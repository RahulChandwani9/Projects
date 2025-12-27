function generatenum1(){
    return Math.floor(Math.random()*100)
}
function generatenum2(){
    return Math.floor(Math.random()*100)
}
function generateop(){
    let operators=['+','-','*','/'];
    let op=Math.floor(Math.random()*4)
    return operators[op];
}
let btn=document.querySelector('.start-btn')
let btn2=document.querySelector('.btn2')

let inp=document.querySelector('.question')
let op1=document.querySelector('.op1')
let op2=document.querySelector('.op2')
let op3=document.querySelector('.op3')
let op4=document.querySelector('.op4')
let options=[op1,op2,op3,op4]
let score=document.querySelector('#score')
let result=document.querySelector('#result')
let pop=document.querySelector('.pop')

let result1;
let gameOver = false;
let answered = false;
let nextQuestionTimeout;
let point=0;
function start(){
    if(gameOver) return;

    answered=false;

    let num1=generatenum1();
    let num2=generatenum2();
    let operator=generateop();
    inp.textContent=num1+" "+operator+" "+num2;

    if(operator==='+'){
        result1=num1+num2
    }
    else if(operator==='-'){
        result1=num1-num2
    }
    else if(operator==='*'){
        result1=num1*num2
    }
    else{
        result1=Math.round((num1 / num2) * 100) / 100;
    }

    let correctindex=Math.floor(Math.random()*4)
    for(let i=0;i<options.length;i++){
        options[i].style.backgroundColor = "";  
        options[i].disabled = false;            
        if(i===correctindex){
            options[i].textContent=result1
        }
        else{
            options[i].textContent=result1+Math.floor(Math.random()*20-10)
        }
    }
}
options.forEach(option => {
    option.addEventListener('click', () => {

        if(answered || gameOver) return;
        answered = true;

        let selected = Number(option.textContent);

        options.forEach(btn => btn.disabled = true);

        if (selected === result1) {
            option.style.backgroundColor = "green";
            point++;
            score.textContent=Number(point)
        } 
        else {
            option.style.backgroundColor = "red";
            score.textContent=Number(point)
        }

        nextQuestionTimeout = setTimeout(() => {
            if(!gameOver) start();  
        }, 500);
    });
});

let timer;
function timeout(){
    let time=document.querySelector('#time')
    let i=30
    time.textContent = i;

    clearInterval(timer);
    clearTimeout(nextQuestionTimeout);
    gameOver = false;

    timer = setInterval(() => {
        i--;
        time.textContent = i;

        if (i <= 0) {
            clearInterval(timer);
            clearTimeout(nextQuestionTimeout);
            gameOver = true;
            time.textContent = "⏰ Time’s Up!";
            options.forEach(btn => btn.disabled = true);
            result.textContent=point
            pop.style.display="block"

        }
    }, 1000);
}


btn.addEventListener('click', () => {
    point = 0;              
    score.textContent = point; 
    timeout();
    start();
});

btn2.addEventListener('click', () => {
    pop.style.display="none"
    point = 0;              
    score.textContent = point; 
    timeout();
    start();
});
