function Generatern(){
    return Math.floor(Math.random()*100)
}
let rn=Generatern();

let NoOfTrials=0;
let inp=document.querySelector('.inp')
let highlow=document.querySelector('#highlow')
let guesses=document.querySelector('#guesses')
let statuss=document.querySelector('#statuss')
let resetbtn = document.createElement('button')
let container = document.querySelector('.container')

function CheckGuess(){
    let enteredvalue = inp.value
    if(enteredvalue<rn){
        statuss.textContent='WRONG'
        statuss.className='fail'
        highlow.textContent='TOO LOW'

    }
    else if(enteredvalue>rn){
        statuss.textContent='WRONG'
        statuss.className='fail'
        highlow.textContent='TOO HIGH'
    }
    else{
        statuss.textContent='CONGRATULATIONS'
        statuss.className='pass'
        highlow.textContent=''
        gameover()
    }
    guesses.textContent += enteredvalue
    inp.value=''
    inp.focus()
    NoOfTrials++
    if(NoOfTrials==10){
        gameover()
    }
}
function gameover(){
    inp.disabled=true;
    resetbtn.textContent='Reset'
    resetbtn.addEventListener('click',()=> resetgame())
    container.appendChild(resetbtn)
    btn.className='d-none'
}
function resetgame(){
    guesses.textContent=''
    statuss.textContent=''
    highlow=''
    NoOfTrials=0;
    rn=Generatern();
    inp.disabled=false
    resetbtn.className='d-none'
    btn.className='d-block'
}