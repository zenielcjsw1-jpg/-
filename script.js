/* ==========================
인원현황판 Lite v1.0
script.js (3-1)
========================== */

const people = document.querySelectorAll(".person");
const board = document.getElementById("board");

const defaultPositions = [
// ===== 왼쪽 =====
{ x: 120, y: 80 },
{ x: 210, y: 80 },

{ x: 120, y: 130 },
{ x: 210, y: 130 },

{ x: 120, y: 180 },
{ x: 210, y: 180 },

{ x: 120, y: 230 },
{ x: 210, y: 230 },

{ x: 120, y: 280 },
{ x: 210, y: 280 },

{ x: 120, y: 330 },
{ x: 210, y: 330 },

// ===== 오른쪽 =====
{ x: 550, y: 80 },
{ x: 640, y: 80 },

{ x: 550, y: 130 },
{ x: 640, y: 130 },

{ x: 550, y: 180 },
{ x: 640, y: 180 },

{ x: 550, y: 230 },
{ x: 640, y: 230 },

{ x: 550, y: 280 },
{ x: 640, y: 280 },

{ x: 550, y: 330 },
{ x: 640, y: 330 }
];

enableDrag(person);

});


function enableDrag(target){

let startX = 0;
let startY = 0;

let moveX = 0;
let moveY = 0;

function dragStart(e){

e.preventDefault();

const point = e.touches ? e.touches[0] : e;

startX = point.clientX;
startY = point.clientY;

moveX = target.offsetLeft;
moveY = target.offsetTop;

document.addEventListener("mousemove",dragMove);
document.addEventListener("mouseup",dragEnd);

document.addEventListener("touchmove",dragMove,{passive:false});
document.addEventListener("touchend",dragEnd);

}

function dragMove(e){

e.preventDefault();

const point = e.touches ? e.touches[0] : e;

let x = moveX + (point.clientX-startX);
let y = moveY + (point.clientY-startY);

const maxX = board.clientWidth - target.offsetWidth;
const maxY = board.clientHeight - target.offsetHeight;

if(x<0) x=0;
if(y<0) y=0;

if(x>maxX) x=maxX;
if(y>maxY) y=maxY;

target.style.left = x+"px";
target.style.top = y+"px";

}

function dragEnd(){

document.removeEventListener("mousemove",dragMove);
document.removeEventListener("mouseup",dragEnd);

document.removeEventListener("touchmove",dragMove);
document.removeEventListener("touchend",dragEnd);

}

target.addEventListener("mousedown",dragStart);
target.addEventListener("touchstart",dragStart,{passive:false});

}

/* ==========================
script.js (3-2)
저장 / 불러오기 / 초기화
========================== */

const STORAGE_KEY = "personnelBoardLite_v1";

/* 저장 */
function savePositions() {

const data = [];

document.querySelectorAll(".person").forEach(person => {

data.push({
id: person.dataset.id,
left: person.style.left,
top: person.style.top
});

});

localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

alert("저장되었습니다.");

}

/* 불러오기 */
function loadPositions() {

const saved = localStorage.getItem(STORAGE_KEY);

if (!saved) {
alert("저장된 데이터가 없습니다.");
return;
}

const data = JSON.parse(saved);

data.forEach(item => {

const person =
document.querySelector(
'.person[data-id="' + item.id + '"]'
);

if (!person) return;

person.style.left = item.left;
person.style.top = item.top;

});

}

/* 초기화 */
function resetPositions() {

document.querySelectorAll(".person")
.forEach((person, index) => {

person.style.left =
defaultPositions[index].x + "px";

person.style.top =
defaultPositions[index].y + "px";

});

localStorage.removeItem(STORAGE_KEY);

}

/* 버튼 연결 */

document
.getElementById("saveBtn")
.addEventListener("click", savePositions);

document
.getElementById("loadBtn")
.addEventListener("click", loadPositions);

document
.getElementById("resetBtn")
.addEventListener("click", resetPositions);

/* 프로그램 시작 시 자동 불러오기 */

window.addEventListener("load", () => {

if (localStorage.getItem(STORAGE_KEY)) {

loadPositions();

}

});

/* ==========================
script.js (3-3)
최종 마무리
========================== */

/* 드래그 중 텍스트 선택 방지 */
document.addEventListener("dragstart", (e) => {
e.preventDefault();
});

/* 창 크기가 변경되어도 현재 위치 유지 */
window.addEventListener("resize", () => {

const saved = localStorage.getItem(STORAGE_KEY);

if (saved) {
loadPositions();
}

});

/* 더블클릭 확대 방지(모바일) */
let lastTouchEnd = 0;

document.addEventListener("touchend", function (event) {

const now = Date.now();

if (now - lastTouchEnd <= 300) {
event.preventDefault();
}

lastTouchEnd = now;

}, { passive: false });

/* 저장 단축키(Ctrl + S) */
document.addEventListener("keydown", (e) => {

if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {

e.preventDefault();

savePositions();

}

});

/* ESC 누르면 초기 위치로 복귀(저장은 유지) */
document.addEventListener("keydown", (e) => {

if (e.key === "Escape") {

document.querySelectorAll(".person").forEach((person, index) => {

person.style.left = defaultPositions[index].x + "px";
person.style.top = defaultPositions[index].y + "px";

});

}

});

console.log("인원현황판 Lite v1.0 실행 완료");

document.getElementById("totalCount").innerText = 25;

document.getElementById("workCount").innerText = 21;

document.getElementById("absentCount").innerText = 2;

document.getElementById("etcCount").innerText = 2;

