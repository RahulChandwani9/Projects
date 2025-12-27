let boxes = document.querySelectorAll('.box');
let box1=document.querySelector('.box1')
let box2=document.querySelector('.box2')
let box3=document.querySelector('.box3')
let box4=document.querySelector('.box4')
let box5=document.querySelector('.box5')
let box6=document.querySelector('.box6')
let box7=document.querySelector('.box7')
let box8=document.querySelector('.box8')
let box9=document.querySelector('.box9')
let btn=document.querySelector('.btn')
let turn = 0;
let resultt=document.querySelector('.result')
btn.addEventListener('click',()=>{ 
    timeout();
    for (let i = 0; i < boxes.length; i++){
    boxes[i].addEventListener('click', () => {
      if (boxes[i].textContent === ""){
            turn++;
            if (turn % 2 === 0) {
                boxes[i].textContent = "O";
                boxes[i].setAttribute('style','color: #0ff;')
                boxes[i].setAttribute('style',' text-shadow: 0 0 7px #0ff, 0 0 15px #0ff;')

            } 
            else 
            {
                boxes[i].textContent = "X";
            }
            boxes[i].style.fontSize = "100px";
        }
        result(); 
    });
};
});
function result(){
        if (
          (box1.textContent==="X" && box2.textContent==="X" && box3.textContent==="X") ||
          (box4.textContent==="X" && box5.textContent==="X" && box6.textContent==="X") ||
          (box7.textContent==="X" && box8.textContent==="X" && box9.textContent==="X") ||
          (box1.textContent==="X" && box4.textContent==="X" && box7.textContent==="X") ||
          (box2.textContent==="X" && box5.textContent==="X" && box8.textContent==="X") ||
          (box3.textContent==="X" && box6.textContent==="X" && box9.textContent==="X") ||
          (box1.textContent==="X" && box5.textContent==="X" && box9.textContent==="X") ||
          (box3.textContent==="X" && box5.textContent==="X" && box7.textContent==="X")
        ) 
        {
            clearInterval(timer);
            resultt.textContent="X WINS"
            setTimeout(() => {
                resultt.setAttribute('style','display:block;')
            }, 100);
            setTimeout(() => {
                resultt.setAttribute('style','display:none;')
            }, 1500);
            
            setTimeout(resetBoard, 200);
        }
        else if (
          (box1.textContent==="O" && box2.textContent==="O" && box3.textContent==="O") ||
          (box4.textContent==="O" && box5.textContent==="O" && box6.textContent==="O") ||
          (box7.textContent==="O" && box8.textContent==="O" && box9.textContent==="O") ||
          (box1.textContent==="O" && box4.textContent==="O" && box7.textContent==="O") ||
          (box2.textContent==="O" && box5.textContent==="O" && box8.textContent==="O") ||
          (box3.textContent==="O" && box6.textContent==="O" && box9.textContent==="O") ||
          (box1.textContent==="O" && box5.textContent==="O" && box9.textContent==="O") ||
          (box3.textContent==="O" && box5.textContent==="O" && box7.textContent==="O")
        ) 
        {
            clearInterval(timer);
            resultt.textContent="O WINS"
            setTimeout(() => {
                resultt.setAttribute('style','display:block;')
            }, 100);
            setTimeout(() => {
                resultt.setAttribute('style','display:none;')
            }, 1500);
            setTimeout(resetBoard, 200);
        }
        else if (
          box1.textContent !== "" && box2.textContent !== "" && box3.textContent !== "" &&
          box4.textContent !== "" && box5.textContent !== "" && box6.textContent !== "" &&
          box7.textContent !== "" && box8.textContent !== "" && box9.textContent !== ""
        ) 
        {
            clearInterval(timer);
            resultt.textContent="ITS A DRAW"
            setTimeout(() => {
                resultt.setAttribute('style','display:block;')
            }, 100);
            setTimeout(() => {
                resultt.setAttribute('style','display:none;')
            }, 1500);
            setTimeout(resetBoard, 200);
        }

}
function resetBoard() {
    box1.textContent=" "
    box2.textContent=" "
    box3.textContent=" "
    box4.textContent=" "
    box5.textContent=" "
    box6.textContent=" "
    box7.textContent=" "
    box8.textContent=" "
    box9.textContent=" "
    turn = 0;


}

let timer;
function timeout(){
    let time=document.querySelector('.time')
    let i=30
    time.textContent = i;

clearInterval(timer);

timer = setInterval(() => {
  i--;
  time.textContent = i;

  if (i <= 0) {
    clearInterval(timer);
    resultt.textContent = "⏰ Time’s Up! Draw!";
    resultt.style.display = "block";
    setTimeout(() => {
      resultt.style.display = "none";
      resetBoard();
    }, 2000);
  }
}, 1000);
}