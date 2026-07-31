/* ==========================
인원현황판 Lite v1.0
script.js (3-1)
========================== */

const people = document.querySelectorAll(".person");
const board = document.getElementById("board");
const warehouse = document.getElementById("warehouse");
const peopleLayer = document.getElementById("peopleLayer");

const defaultPositions = [

/* 자동화창고 내부 - 왼쪽 */

{ x:0.36, y:0.16 },
{ x:0.46, y:0.16 },

{ x:0.36, y:0.23 },
{ x:0.46, y:0.23 },

{ x:0.36, y:0.30 },
{ x:0.46, y:0.30 },

{ x:0.36, y:0.37 },
{ x:0.46, y:0.37 },

{ x:0.36, y:0.44 },
{ x:0.46, y:0.44 },

/* 자동화창고 내부 - 오른쪽 */

{ x:0.56, y:0.16 },
{ x:0.66, y:0.16 },

{ x:0.56, y:0.23 },
{ x:0.66, y:0.23 },

{ x:0.56, y:0.30 },
{ x:0.66, y:0.30 },

{ x:0.56, y:0.37 },
{ x:0.66, y:0.37 },

{ x:0.56, y:0.44 },
{ x:0.66, y:0.44 }

];

function getWarehouseRect(){

return warehouse.getBoundingClientRect();

}
function resizePeopleLayer(){

const rect = getWarehouseRect();

const boardRect = getBoardRect();


peopleLayer.style.position = "absolute";


peopleLayer.style.left =
(rect.left - boardRect.left) + "px";


peopleLayer.style.top =
(rect.top - boardRect.top) + "px";


peopleLayer.style.width =
rect.width + "px";


peopleLayer.style.height =
rect.height + "px";

}


function getBoardRect(){

return board.getBoundingClientRect();

}

/* ==========================
V2.2 좌표 엔진
========================== */

/* 이미지 기준 px → 비율 */
function toPercent(pxX, pxY){

    const rect = getWarehouseRect();

    return {

        x : pxX / rect.width,

        y : pxY / rect.height

    };

}

/* 이미지 기준 비율 → px */
function toPixel(percentX, percentY){

    const rect = getWarehouseRect();

    return {

        x : rect.width * percentX,

        y : rect.height * percentY

    };

}

/* 현재 이름표의 이미지 기준 비율 좌표 */
function getPersonPercent(person){

    return toPercent(

        person.offsetLeft,

        person.offsetTop

    );

}

/* 비율 좌표를 화면에 적용 */
function setPersonPercent(person, x, y){


const pos = toPixel(x, y);


/* 화면 표시 */

person.style.left =
pos.x + "px";


person.style.top =
pos.y + "px";


/* V2.2 좌표 기억 */

person.dataset.x = x;

person.dataset.y = y;


}


resizePeopleLayer();

people.forEach((person, index) => {

    setPersonPercent(

        person,

        defaultPositions[index].x,

        defaultPositions[index].y

    );

    enableDrag(person);

});

let isDragging = false;

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

isDragging = false;
  
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


const imageRect = getWarehouseRect();
const boardRect = getBoardRect();


const minX = imageRect.left - boardRect.left;
const minY = imageRect.top - boardRect.top;


const maxX =
minX + imageRect.width - target.offsetWidth;

const maxY =
minY + imageRect.height - target.offsetHeight;


if(x < minX) x = minX;

if(y < minY) y = minY;


if(x > maxX) x = maxX;

if(y > maxY) y = maxY;


isDragging = true;

/* peopleLayer 기준 좌표로 변환 */
const layerRect = peopleLayer.getBoundingClientRect();

const localX = x - (imageRect.left - boardRect.left);
const localY = y - (imageRect.top - boardRect.top);

/* 좌표 적용 */
target.style.left = localX + "px";
target.style.top = localY + "px"

    
}

function dragEnd(){


document.removeEventListener(
"mousemove",
dragMove
);


document.removeEventListener(
"mouseup",
dragEnd
);


document.removeEventListener(
"touchmove",
dragMove
);


document.removeEventListener(
"touchend",
dragEnd
);



/* =====================
V2.2 좌표 저장
드래그 종료 시
이미지 기준 비율 변환
===================== */


const percent =
getPersonPercent(target);


target.dataset.x =
percent.x;


target.dataset.y =
percent.y;


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


const pos = getPersonPercent(person);


person.dataset.x = pos.x;

person.dataset.y = pos.y;


data.push({

    id: person.dataset.id,

    x: pos.x,

    y: pos.y,

    status:
    statusMap[person.dataset.id]

});


});


localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
);


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


/* V2.2 이미지 기준 좌표 적용 */

if(
item.x !== undefined &&
item.y !== undefined
){

setPersonPercent(

person,

item.x,

item.y

);

}


/* 상태 복원 */

statusMap[item.id] = item.status;

updatePersonColor(
person,
item.status
);


});


updateAttendance();


}

/* 초기화 */

function resetPositions() {


document.querySelectorAll(".person")
.forEach((person, index) => {


setPersonPercent(

person,

defaultPositions[index].x,

defaultPositions[index].y

);



statusMap[person.dataset.id] = "출근";


updatePersonColor(

person,

"출근"

);


});


updateAttendance();


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


/* ==========================
최초 실행 자동 배치 유지
========================== */

let firstLoad = true;

window.addEventListener("load",()=>{


const saved =
localStorage.getItem(STORAGE_KEY);



if(!saved && firstLoad){



document.querySelectorAll(".person")
.forEach((person,index)=>{



setPersonPercent(

person,

defaultPositions[index].x,

defaultPositions[index].y

);



});



firstLoad = false;


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


document.querySelectorAll(".person")
.forEach((person,index)=>{


setPersonPercent(

person,

defaultPositions[index].x,

defaultPositions[index].y

);


});


}


});


/* ==========================
직원 상태 관리
========================== */

const totalPeople = [];
const workPeople = [];
const absentPeople = [];
const etcPeople = [];

const statusMap = {};

document.querySelectorAll(".person").forEach(person=>{

statusMap[person.dataset.id]="출근";

updatePersonColor(person,"출근");
  
});

updateAttendance();

function updateAttendance(){

const total=[];

const work=[];

const absent=[];

const etc=[];

document.querySelectorAll(".person").forEach(person=>{

const name=person.innerText;

const state=statusMap[person.dataset.id];

total.push(name);

if(state==="출근"){

work.push(name);

}else if(state==="결근"){

absent.push(name);

}else{

etc.push(name);

}

});

document.getElementById("totalCount").innerText=total.length;
document.getElementById("workCount").innerText=work.length;
document.getElementById("absentCount").innerText=absent.length;
document.getElementById("etcCount").innerText=etc.length;

  totalPeople.length = 0;

workPeople.length = 0;

absentPeople.length = 0;

etcPeople.length = 0;

totalPeople.push(...total);

workPeople.push(...work);

absentPeople.push(...absent);

etcPeople.push(...etc);

}

document.querySelectorAll(".person").forEach(person=>{

person.addEventListener("dblclick",()=>{

const current=statusMap[person.dataset.id];

let next="출근";

if(current==="출근"){

next="결근";

}else if(current==="결근"){

next="기타";

}else{

next="출근";

}

statusMap[person.dataset.id]=next;

updatePersonColor(person, next);
  
updateAttendance();
 

});

});

/* ==========================
직원 상태 팝업
========================== */

let selectedPerson = null;

document.querySelectorAll(".person").forEach(person=>{

person.addEventListener("click",()=>{

if(isDragging){

isDragging = false;

return;

}

selectedPerson = person;

document.getElementById("statusTitle").innerText =
person.innerText;

document.getElementById("statusPopup").style.display="flex";

});

});

document.getElementById("closeStatusPopup").onclick = function () {

    document.getElementById("statusPopup").style.display = "none";

    selectedPerson = null;

};

/* ==========================
상태 변경 연동
이름표 ↔ 출근부
========================== */

document.querySelectorAll(".status-btn").forEach(btn => {

    btn.addEventListener("click", () => {

        if (!selectedPerson) return;


        const status = btn.dataset.status;


        // 상태 저장
        statusMap[selectedPerson.dataset.id] = status;


        // 이름표 색상 변경
        updatePersonColor(
            selectedPerson,
            status
        );


        // 출근부 숫자 즉시 갱신
        updateAttendance();


        // 변경 즉시 자동 저장
        saveStatusOnly();


        // 팝업 닫기
        document.getElementById("statusPopup").style.display = "none";


        selectedPerson = null;


    });

});
function updatePersonColor(person, status){

switch(status){

case "출근":
person.style.background="#b7f7b2";
break;

case "결근":
person.style.background="#ffb3b3";
break;

case "휴가":
person.style.background="#fff3a3";
break;

case "병가":
person.style.background="#ffd3a6";
break;

case "조퇴":
person.style.background="#b9dcff";
break;

case "연장":
person.style.background="#e0c4ff";
break;

default:
person.style.background="#ffffff";

}
 
}




/* ==========================
출근부 팝업
========================== */

function openPopup(title,list){

document.getElementById("popupTitle").innerText = title;

const box = document.getElementById("popupList");

box.innerHTML = "";

list.forEach(name=>{

const div = document.createElement("div");

div.innerText = name;

div.style.cursor = "pointer";
div.style.padding = "10px";

div.onclick = function(){

const person = [...document.querySelectorAll(".person")]
.find(p=>p.innerText===name);

if(!person) return;

selectedPerson = person;

document.getElementById("popup").style.display = "none";

document.getElementById("statusTitle").innerText = name;

document.getElementById("statusPopup").style.display = "flex";

};

box.appendChild(div);

});

document.getElementById("popup").style.display = "flex";

}

document.getElementById("closePopup").onclick=function(){

document.getElementById("popup").style.display="none";

};

document.getElementById("totalBox").onclick=function(){

openPopup("총원",totalPeople);

};

document.getElementById("workBox").onclick=function(){

openPopup("출근",workPeople);

};

document.getElementById("absentBox").onclick=function(){

openPopup("결근",absentPeople);

};

document.getElementById("etcBox").onclick=function(){

openPopup("기타",etcPeople);

};

/* ==========================
출근부 날짜 표시
========================== */

function updateTodayDate(){

const today = new Date();

const year = today.getFullYear();

const month = today.getMonth()+1;

const date = today.getDate();

const day = [
"일",
"월",
"화",
"수",
"목",
"금",
"토"
][today.getDay()];


document.getElementById("todayDate").innerText =
`${year}년 ${month}월 ${date}일 (${day})`;

}


updateTodayDate();


/* ==========================
상태만 저장
========================== */

function saveStatusOnly(){

const data = [];


document.querySelectorAll(".person").forEach(person=>{

data.push({

id:person.dataset.id,

left:person.style.left,

top:person.style.top,

status:statusMap[person.dataset.id]

});

});


localStorage.setItem(
STORAGE_KEY,
JSON.stringify(data)
);


}

/* ==========================
V2.2 화면 변경 대응
========================== */


function refreshPeoplePosition(){


resizePeopleLayer();


document.querySelectorAll(".person")
.forEach(person=>{


const savedX = person.dataset.x;

const savedY = person.dataset.y;


if(
savedX !== undefined &&
savedY !== undefined
){


setPersonPercent(

person,

Number(savedX),

Number(savedY)

);


}


});


}


/* 화면 크기 변경 */

window.addEventListener("resize",()=>{


refreshPeoplePosition();


});


/* 최초 실행 */

window.addEventListener("load",()=>{


resizePeopleLayer();


});
