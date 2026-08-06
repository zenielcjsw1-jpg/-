/* ==========================
인원현황판 Lite v2.3
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
좌표 엔진
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

    const x =
    parseFloat(person.style.left);


    const y =
    parseFloat(person.style.top);


    return toPercent(
        x,
        y
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


/* 좌표 기억 */

person.dataset.x =
Number(x.toFixed(4));


person.dataset.y =
Number(y.toFixed(4));


}


/* 드래그 핸들러만 미리 연결 (좌표 배치는 이미지 로드 후 window.load에서 처리) */
people.forEach((person) => {

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

const imageRect = getWarehouseRect();


let localX = moveX + (point.clientX-startX);
let localY = moveY + (point.clientY-startY);



const maxX =
imageRect.width - target.offsetWidth;


const maxY =
imageRect.height - target.offsetHeight;



if(localX < 0) localX = 0;

if(localY < 0) localY = 0;


if(localX > maxX) localX = maxX;

if(localY > maxY) localY = maxY;



if(
Math.abs(point.clientX-startX) > 5 ||
Math.abs(point.clientY-startY) > 5
){

    isDragging = true;

}



target.style.left =
localX + "px";


target.style.top =
localY + "px";

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
좌표 저장
드래그 종료 시
이미지 기준 비율 변환
===================== */


const percent =
getPersonPercent(target);


target.dataset.x =
Number(percent.x.toFixed(4));


target.dataset.y =
Number(percent.y.toFixed(4));


}

target.addEventListener("mousedown",dragStart);
target.addEventListener("touchstart",dragStart,{passive:false});

}

/* ==========================
script.js (3-2)
저장 / 불러오기 / 초기화
========================== */

const STORAGE_KEY = "personnelBoardLite_v22";
const NOTE_KEY = "personnelBoardLite_note";

/* 저장 */
function savePositions() {

const data = [];

document.querySelectorAll(".person").forEach(person => {


const pos = getPersonPercent(person);


person.dataset.x = pos.x;

person.dataset.y = pos.y;


data.push({

id: person.dataset.id,

x: Number(pos.x.toFixed(4)),

y: Number(pos.y.toFixed(4)),

status:
statusMap[person.dataset.id]

});

});


localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
);


saveNote();


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


/* 이미지 기준 좌표 적용 */

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


/* 상태 복원 (알 수 없는 상태값은 '기타'로 안전하게 처리) */

const restoredStatus =
(item.status && statusConfig[item.status])
? item.status
: "기타";

statusMap[item.id] = restoredStatus;

updatePersonColor(
person,
restoredStatus
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



statusMap[person.dataset.id] = "외식";


updatePersonColor(

person,

"외식"

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


/* ==========================
script.js (3-3)
최종 마무리
========================== */

/* 드래그 중 텍스트 선택 방지 */
document.addEventListener("dragstart", (e) => {
e.preventDefault();
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
const oesikPeople = [];
const seokganPeople = [];
const gwangyeokPeople = [];
const absentPeople = [];
const etcPeople = [];



const statusMap = {};

/* ==========================
   상태 디자인 설정
========================== */

const statusConfig = {

"외식":{
    color:"#D8F3DC",
    icon:"🍱"
},

"석간":{
    color:"#FFF3BF",
    icon:"🌙"
},

"광역":{
    color:"#D0EBFF",
    icon:"🚌"
},

"휴가":{
    color:"#FFF3BF",
    icon:"🏝️"
},

"병가":{
    color:"#FFD8A8",
    icon:"🩹"
},

"결근":{
    color:"#FFC9C9",
    icon:"⛔"
},

"조퇴":{
    color:"#D0EBFF",
    icon:"🚪"
},

"연장":{
    color:"#E5DBFF",
    icon:"🌇"

},

"기타":{
    color:"#E5E7EB",
    icon:"📌"

}
    
 "1층":{
    color:"#E5E7EB",
    icon:"1️⃣"

}

};

/* 세 가지 출근 상태를 하나로 묶어 판별할 때 사용 */
const WORK_STATUSES = ["외식", "석간", "광역"];







document.querySelectorAll(".person").forEach(person=>{

statusMap[person.dataset.id]="외식";

updatePersonColor(person,"외식");

});

updateAttendance();

function updateAttendance(){

const total=[];

const oesik=[];

const seokgan=[];

const gwangyeok=[];

const absent=[];

const etc=[];

document.querySelectorAll(".person").forEach(person=>{

const name =
person.dataset.name || person.innerText;

const state=statusMap[person.dataset.id];

total.push(name);

if(state==="외식"){

oesik.push(name);

}else if(state==="석간"){

seokgan.push(name);

}else if(state==="광역"){

gwangyeok.push(name);

}else if(state==="결근"){

absent.push(name);

}else{

etc.push(name);

}

});

document.getElementById("totalCount").innerText=total.length;
document.getElementById("oesikCount").innerText=oesik.length;
document.getElementById("seokganCount").innerText=seokgan.length;
document.getElementById("gwangyeokCount").innerText=gwangyeok.length;
document.getElementById("absentCount").innerText=absent.length;
document.getElementById("etcCount").innerText=etc.length;

  totalPeople.length = 0;

oesikPeople.length = 0;

seokganPeople.length = 0;

gwangyeokPeople.length = 0;

absentPeople.length = 0;

etcPeople.length = 0;

totalPeople.push(...total);

oesikPeople.push(...oesik);

seokganPeople.push(...seokgan);

gwangyeokPeople.push(...gwangyeok);

absentPeople.push(...absent);

etcPeople.push(...etc);

}

document.querySelectorAll(".person").forEach(person=>{

person.addEventListener("dblclick",()=>{

const current=statusMap[person.dataset.id];

let next="외식";

if(WORK_STATUSES.includes(current)){

next="결근";

}else if(current==="결근"){

next="기타";

}else{

next="외식";

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
person.dataset.name || person.innerText;

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

function updatePersonColor(person,status){

const config =
statusConfig[status];


if(!config) return;


/* 색상 */

person.style.background =
config.color;


/* 아이콘 + 이름 표시 */

const name =
person.dataset.name ||
person.innerText;


person.dataset.name = name;


person.innerHTML =
`
<span class="status-icon">
${config.icon}
</span>
<span class="person-name">
${name}
</span>
`;

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
.find(p=>p.dataset.name===name);

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

document.getElementById("oesikBox").onclick=function(){

openPopup("출근(외식)",oesikPeople);

};

document.getElementById("seokganBox").onclick=function(){

openPopup("출근(석간)",seokganPeople);

};

document.getElementById("gwangyeokBox").onclick=function(){

openPopup("출근(광역)",gwangyeokPeople);

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


}

/* ==========================
특이사항 메모장
========================== */

const noteText = document.getElementById("noteText");

/* 불러오기 */
noteText.value = localStorage.getItem(NOTE_KEY) || "";

/* 입력할 때마다 자동 저장 */
noteText.addEventListener("input", () => {

saveNote();

});

function saveNote(){

localStorage.setItem(
NOTE_KEY,
noteText.value
);

}


/* ==========================
화면 변경 대응
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
window.addEventListener("load",()=>{

/* 이미지 로드가 끝난 시점이므로 여기서 최초 배치 진행 */

document.querySelectorAll(".person")
.forEach((person,index)=>{


setPersonPercent(

person,

defaultPositions[index].x,

defaultPositions[index].y

);


});


resizePeopleLayer();


const saved =
localStorage.getItem(STORAGE_KEY);


if(saved){

    loadPositions();

}

});
