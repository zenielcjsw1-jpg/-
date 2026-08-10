/* ==========================
인원현황판 Lite v2.3
========================== */

const people = document.querySelectorAll(".person");
const board = document.getElementById("board");
const warehouse = document.getElementById("warehouse");
const peopleLayer = document.getElementById("peopleLayer");
const stagingArea = document.getElementById("stagingArea");

/* 저장소 키 (다른 코드보다 먼저 정의하여 항상 안전하게 참조 가능) */
const STORAGE_KEY = "personnelBoardLite_v25";
const NOTE_KEY = "personnelBoardLite_note";

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
초기 배치 (레이아웃 안정화 후 실행)
- 뒤쪽 코드에서 오류가 나더라도 이름표 배치/드래그가
  항상 정상 동작하도록 최대한 앞쪽에서 등록해둠
========================== */

function initBoardPositions(){

/* 이미지가 아직 실제 크기로 렌더링되지 않았다면 다음 프레임에 재시도 */

const rect = getWarehouseRect();

if(rect.width === 0 || rect.height === 0){

requestAnimationFrame(initBoardPositions);

return;

}


resizePeopleLayer();


/* 저장된 배치가 있을 때만 복원 (없으면 전원 대기 영역에 그대로 둠) */

try{

const saved =
localStorage.getItem(STORAGE_KEY);


if(saved){

    loadPositions(true);

}

}catch(err){

console.error("저장된 배치 불러오기 중 오류", err);

}

}

/* 이미지가 캐시되어 이미 로드된 경우도 대응 */

if(warehouse.complete){

requestAnimationFrame(initBoardPositions);

}else{

warehouse.addEventListener("load", () => {

requestAnimationFrame(initBoardPositions);

});

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


let isDragging = false;

function isPointInRect(x, y, rect){

return (
x >= rect.left &&
x <= rect.right &&
y >= rect.top &&
y <= rect.bottom
);

}

/* 이름표를 창고 이미지 위(온보드 상태)로 배치 */
function moveToBoard(person, clientX, clientY, persist){

peopleLayer.appendChild(person);

person.classList.remove("staging");
person.classList.add("on-board");

person.style.position = "absolute";

const imageRect = getWarehouseRect();

const w = person.offsetWidth || 95;
const h = person.offsetHeight || 38;

let pxX = clientX - imageRect.left - (w/2);
let pxY = clientY - imageRect.top - (h/2);

const maxX = imageRect.width - w;
const maxY = imageRect.height - h;

if(pxX < 0) pxX = 0;
if(pxY < 0) pxY = 0;
if(pxX > maxX) pxX = maxX;
if(pxY > maxY) pxY = maxY;

const percent = toPercent(pxX, pxY);

setPersonPercent(person, percent.x, percent.y);

if(persist !== false){

try{ saveStatusOnly(); }catch(err){ console.error("배치 저장 중 오류", err); }

}

}

/* 이름표를 대기 영역으로 되돌림 */
function moveToStaging(person, persist){

stagingArea.appendChild(person);

person.classList.remove("on-board");
person.classList.add("staging");

person.style.position = "";
person.style.left = "";
person.style.top = "";

delete person.dataset.x;
delete person.dataset.y;

if(persist !== false){

try{ saveStatusOnly(); }catch(err){ console.error("배치 저장 중 오류", err); }

}

}

/* 드래그 핸들러 연결 */
people.forEach((person) => {

    enableDrag(person);

});

function enableDrag(target){

let startClientX = 0;
let startClientY = 0;

let grabOffsetX = 0;
let grabOffsetY = 0;

let dragModeActive = false;

function dragStart(e){

const point = e.touches ? e.touches[0] : e;

const rect = target.getBoundingClientRect();

grabOffsetX = point.clientX - rect.left;
grabOffsetY = point.clientY - rect.top;

startClientX = point.clientX;
startClientY = point.clientY;

isDragging = false;

dragModeActive = false;

document.addEventListener("mousemove",dragMove);
document.addEventListener("mouseup",dragEnd);

document.addEventListener("touchmove",dragMove,{passive:false});
document.addEventListener("touchend",dragEnd);

}

function enterDragMode(rect){

/* 뷰포트 기준 자유 이동을 위해 고정 위치로 전환, body 최상단으로 이동 */

target.style.width = rect.width + "px";
target.style.height = rect.height + "px";
target.style.left = rect.left + "px";
target.style.top = rect.top + "px";

target.classList.add("dragging");

document.body.appendChild(target);

dragModeActive = true;

}

function dragMove(e){

const point = e.touches ? e.touches[0] : e;

if(
!isDragging &&
(
Math.abs(point.clientX-startClientX) > 5 ||
Math.abs(point.clientY-startClientY) > 5
)
){

    isDragging = true;

    enterDragMode(target.getBoundingClientRect());

}

if(!dragModeActive) return;

e.preventDefault();

target.style.left = (point.clientX - grabOffsetX) + "px";

target.style.top = (point.clientY - grabOffsetY) + "px";

}

function dragEnd(e){

document.removeEventListener("mousemove",dragMove);
document.removeEventListener("mouseup",dragEnd);
document.removeEventListener("touchmove",dragMove,{passive:false});
document.removeEventListener("touchend",dragEnd);


/* 실제로 드래그 모드까지 진입하지 않았다면(=단순 클릭) DOM을 건드리지 않고 종료 */

if(!dragModeActive) return;


target.classList.remove("dragging");

target.style.width = "";
target.style.height = "";

const point = (e.changedTouches && e.changedTouches[0]) || e;

const clientX = point.clientX;
const clientY = point.clientY;

const imageRect = getWarehouseRect();

if(isPointInRect(clientX, clientY, imageRect)){

moveToBoard(target, clientX, clientY);

}else{

moveToStaging(target);

}

}

target.addEventListener("mousedown",dragStart);
target.addEventListener("touchstart",dragStart,{passive:false});

}

/* ==========================
저장 / 불러오기 / 초기화
========================== */

/* 저장 */
function savePositions() {

const data = [];

document.querySelectorAll(".person").forEach(person => {

const onBoard = person.classList.contains("on-board");

let x, y;

if(onBoard){

const pos = getPersonPercent(person);

x = Number(pos.x.toFixed(4));

y = Number(pos.y.toFixed(4));

person.dataset.x = x;

person.dataset.y = y;

}


data.push({

id: person.dataset.id,

location: onBoard ? "board" : "staging",

x: x,

y: y,

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
function loadPositions(silent) {

const saved = localStorage.getItem(STORAGE_KEY);


if (!saved) {

if(!silent) alert("저장된 데이터가 없습니다.");

return;

}


let data;

try{

data = JSON.parse(saved);

}catch(err){

console.error("저장 데이터 파싱 실패, 초기화합니다.", err);

localStorage.removeItem(STORAGE_KEY);

return;

}


if(!Array.isArray(data)){

localStorage.removeItem(STORAGE_KEY);

return;

}


data.forEach(item => {

try{


const person =
document.querySelector(
'.person[data-id="' + item.id + '"]'
);


if (!person) return;


/* 위치(대기영역/온보드) 복원 */

const location = item.location === "board" ? "board" : "staging";

if(
location === "board" &&
item.x !== undefined &&
item.y !== undefined
){

peopleLayer.appendChild(person);

person.classList.remove("staging");
person.classList.add("on-board");

person.style.position = "absolute";

setPersonPercent(

person,

item.x,

item.y

);

}else{

stagingArea.appendChild(person);

person.classList.remove("on-board");
person.classList.add("staging");

person.style.position = "";
person.style.left = "";
person.style.top = "";

delete person.dataset.x;
delete person.dataset.y;

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

}catch(err){

console.error("한 명의 데이터를 복원하는 중 오류가 발생해 건너뜁니다.", err);

}

});


try{

updateAttendance();

}catch(err){

console.error("출근 현황 갱신 중 오류", err);

}


}

/* 초기화 */

function resetPositions() {


document.querySelectorAll(".person")
.forEach((person) => {


moveToStaging(person, false);



statusMap[person.dataset.id] = "주간";


updatePersonColor(

person,

"주간"

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

/* ESC 누르면 전원 대기 영역으로 되돌림 (저장 데이터는 건드리지 않음) */
document.addEventListener("keydown", (e) => {


if (e.key === "Escape") {


document.querySelectorAll(".person")
.forEach((person)=>{


moveToStaging(person, false);


});


}


});


/* ==========================
직원 상태 관리
========================== */

const totalPeople = [];
const dayPeople = [];
const seokganPeople = [];
const gwangyeokPeople = [];
const floor1People = [];
const officePeople = [];
const absentPeople = [];
const etcPeople = [];



const statusMap = {};

/* ==========================
   상태 디자인 설정
========================== */

const statusConfig = {

"주간":{
    color:"#D8F3DC",
    icon:"☀️"
},

"석간":{
    color:"#FEF9C3",
    icon:"🌙"
},

"광역":{
    color:"#D0EBFF",
    icon:"🚌"
},

"1층":{
    color:"#E0F2FE",
    icon:"1️⃣"
},

"사무실":{
    color:"#FCE7F3",
    icon:"🏢"
},

"휴가":{
    color:"#FDE68A",
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
    color:"#BAE6FD",
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

};

/* 근무 성격의 상태 (더블클릭 순환 판별용) */
const WORK_STATUSES = ["주간", "석간", "광역", "1층", "사무실"];

/* 결근 카드에 함께 집계할 상태 */
const ABSENT_STATUSES = ["결근", "휴가", "병가", "조퇴"];







document.querySelectorAll(".person").forEach(person=>{

statusMap[person.dataset.id]="주간";

updatePersonColor(person,"주간");

});

try{

updateAttendance();

}catch(err){

console.error("초기 출근 현황 계산 중 오류", err);

}

function updateAttendance(){

const total=[];

const day=[];

const seokgan=[];

const gwangyeok=[];

const floor1=[];

const office=[];

const absent=[];

const etc=[];

document.querySelectorAll(".person").forEach(person=>{

const name =
person.dataset.name || person.innerText;

const state=statusMap[person.dataset.id];

total.push(name);

if(state==="주간"){

day.push(name);

}else if(state==="석간"){

seokgan.push(name);

}else if(state==="광역"){

gwangyeok.push(name);

}else if(state==="1층"){

floor1.push(name);

}else if(state==="사무실"){

office.push(name);

}else if(ABSENT_STATUSES.includes(state)){

absent.push(name);

}else{

etc.push(name);

}

});

function setCountText(id, value){

const el = document.getElementById(id);

if(el) el.innerText = value;

}

setCountText("totalCount", total.length);
setCountText("dayCount", day.length);
setCountText("seokganCount", seokgan.length);
setCountText("gwangyeokCount", gwangyeok.length);
setCountText("floor1Count", floor1.length);
setCountText("officeCount", office.length);
setCountText("absentCount", absent.length);
setCountText("etcCount", etc.length);

  totalPeople.length = 0;

dayPeople.length = 0;

seokganPeople.length = 0;

gwangyeokPeople.length = 0;

floor1People.length = 0;

officePeople.length = 0;

absentPeople.length = 0;

etcPeople.length = 0;

totalPeople.push(...total);

dayPeople.push(...day);

seokganPeople.push(...seokgan);

gwangyeokPeople.push(...gwangyeok);

floor1People.push(...floor1);

officePeople.push(...office);

absentPeople.push(...absent);

etcPeople.push(...etc);

}

document.querySelectorAll(".person").forEach(person=>{

person.addEventListener("dblclick",()=>{

const current=statusMap[person.dataset.id];

let next="주간";

if(WORK_STATUSES.includes(current)){

next="결근";

}else if(current==="결근"){

next="기타";

}else{

next="주간";

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

document.getElementById("dayBox").onclick=function(){

openPopup("출근(주간)",dayPeople);

};

document.getElementById("seokganBox").onclick=function(){

openPopup("출근(석간)",seokganPeople);

};

document.getElementById("gwangyeokBox").onclick=function(){

openPopup("출근(광역)",gwangyeokPeople);

};

document.getElementById("floor1Box").onclick=function(){

openPopup("1층",floor1People);

};

document.getElementById("officeBox").onclick=function(){

openPopup("사무실",officePeople);

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

const onBoard = person.classList.contains("on-board");

let x, y;

if(onBoard){

const pos = getPersonPercent(person);

x = pos.x;

y = pos.y;

person.dataset.x = x;

person.dataset.y = y;

}


data.push({

id: person.dataset.id,

location: onBoard ? "board" : "staging",

x: x,

y: y,

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

function saveNote(){

const el = document.getElementById("noteText");

if(!el) return;

localStorage.setItem(
NOTE_KEY,
el.value
);

}

try{

const noteText = document.getElementById("noteText");

/* 불러오기 */
noteText.value = localStorage.getItem(NOTE_KEY) || "";

/* 입력할 때마다 자동 저장 */
noteText.addEventListener("input", () => {

saveNote();

});

}catch(err){

console.error("특이사항 메모장 초기화 중 오류", err);

}


/* ==========================
오늘업무 (TODO)
- 번호 자동 생성
- 삭제 대신 '작업중' / '완료' 버튼으로 처리 상태 표시
- 다른 영역에서 오류가 나도 이 블록은 독립적으로 항상 동작하도록 try/catch로 감쌈
========================== */

try{

const TODO_KEY = "personnelBoardLite_todo_v2";

const todoInput = document.getElementById("todoInput");
const todoAddBtn = document.getElementById("todoAddBtn");
const todoResetBtn = document.getElementById("todoResetBtn");
const todoList = document.getElementById("todoList");

let todoItems = [];

function loadTodos(){

const saved = localStorage.getItem(TODO_KEY);

let parsed = [];

try{

parsed = saved ? JSON.parse(saved) : [];

if(!Array.isArray(parsed)) parsed = [];

}catch(err){

parsed = [];

}

/* 예전 버전(문자열 배열) 데이터를 새 형식으로 안전하게 변환 */

todoItems = parsed.map(item => {

if(typeof item === "string"){

return { text:item, state:"pending" };

}

return {

text: (item && typeof item.text === "string") ? item.text : "",

state: (item && (item.state === "progress" || item.state === "done")) ? item.state : "pending"

};

}).filter(item => item.text !== "");

renderTodos();

}

function saveTodos(){

localStorage.setItem(
TODO_KEY,
JSON.stringify(todoItems)
);

}

function renderTodos(){

todoList.innerHTML = "";

if(todoItems.length === 0){

const empty = document.createElement("p");

empty.className = "todo-empty";

empty.id = "todoEmpty";

empty.innerText = "오늘 업무를 추가하세요.";

todoList.appendChild(empty);

return;

}

todoItems.forEach((todo, index) => {

const item = document.createElement("div");

item.className = "todo-item";

if(todo.state === "progress") item.classList.add("is-progress");

if(todo.state === "done") item.classList.add("is-done");


const num = document.createElement("span");

num.className = "todo-num";

num.innerText = index + 1;


const span = document.createElement("span");

span.className = "todo-text";

span.innerText = todo.text;


const actions = document.createElement("div");

actions.className = "todo-actions";


const progressBtn = document.createElement("button");

progressBtn.className = "todo-action-btn progress-btn";

if(todo.state === "progress") progressBtn.classList.add("active");

progressBtn.innerText = "작업중";

progressBtn.addEventListener("click", () => {

todo.state = (todo.state === "progress") ? "pending" : "progress";

saveTodos();

renderTodos();

});


const doneBtn = document.createElement("button");

doneBtn.className = "todo-action-btn done-btn";

if(todo.state === "done") doneBtn.classList.add("active");

doneBtn.innerText = "완료";

doneBtn.addEventListener("click", () => {

todo.state = (todo.state === "done") ? "pending" : "done";

saveTodos();

renderTodos();

});


actions.appendChild(progressBtn);

actions.appendChild(doneBtn);


item.appendChild(num);

item.appendChild(span);

item.appendChild(actions);

todoList.appendChild(item);

});

}

function addTodo(){

const value = todoInput.value.trim();

if(value === "") return;

todoItems.push({ text:value, state:"pending" });

todoInput.value = "";

saveTodos();

renderTodos();

}

todoAddBtn.addEventListener("click", addTodo);

todoInput.addEventListener("keydown", (e) => {

if(e.key === "Enter"){

e.preventDefault();

addTodo();

}

});

todoResetBtn.addEventListener("click", () => {

if(todoItems.length === 0) return;

if(!confirm("오늘 업무 목록을 모두 초기화할까요?")) return;

todoItems = [];

saveTodos();

renderTodos();

});

loadTodos();

}catch(err){

console.error("오늘업무(TODO) 기능 초기화 중 오류", err);

}


/* ==========================
관리자 모드: 레이아웃 리사이즈 / 이름표 크기 조절
- 독립 기능이므로 다른 영역 오류의 영향을 받지 않도록 try/catch로 감쌈
========================== */

try{

const LAYOUT_KEY = "personnelBoardLite_layout_v1";

const DEFAULT_LAYOUT = {

left: 16,
center: 52,
staging: 16,
right: 16,
devNoteHeight: 180,
personScale: 100

};

const mainLayout = document.querySelector(".main-layout");

const leftEl = document.querySelector(".left-todo");
const centerEl = document.querySelector(".center-board");
const stagingEl = document.querySelector(".staging-panel");
const rightEl = document.querySelector(".right-panel");
const devNoteEl = document.querySelector(".dev-note");

const layoutModeBtn = document.getElementById("layoutModeBtn");
const layoutResetBtn = document.getElementById("layoutResetBtn");
const personSizeSlider = document.getElementById("personSizeSlider");
const personSizeValue = document.getElementById("personSizeValue");

let layoutConfig = Object.assign({}, DEFAULT_LAYOUT);

function loadLayoutConfig(){

try{

const saved = localStorage.getItem(LAYOUT_KEY);

if(saved){

const parsed = JSON.parse(saved);

layoutConfig = Object.assign({}, DEFAULT_LAYOUT, parsed);

}

}catch(err){

layoutConfig = Object.assign({}, DEFAULT_LAYOUT);

}

}

function saveLayoutConfig(){

localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutConfig));

}

function applyLayoutConfig(){

if(leftEl) leftEl.style.width = layoutConfig.left + "%";
if(centerEl) centerEl.style.width = layoutConfig.center + "%";
if(stagingEl) stagingEl.style.width = layoutConfig.staging + "%";
if(rightEl) rightEl.style.width = layoutConfig.right + "%";

if(devNoteEl) devNoteEl.style.height = layoutConfig.devNoteHeight + "px";

const scale = layoutConfig.personScale / 100;

document.documentElement.style.setProperty("--person-w", (95*scale).toFixed(1)+"px");
document.documentElement.style.setProperty("--person-h", (38*scale).toFixed(1)+"px");
document.documentElement.style.setProperty("--person-font", (14*scale).toFixed(1)+"px");

if(personSizeSlider) personSizeSlider.value = layoutConfig.personScale;

if(personSizeValue) personSizeValue.innerText = layoutConfig.personScale + "%";


try{ resizePeopleLayer(); }catch(err){}

}

loadLayoutConfig();

applyLayoutConfig();


/* 관리자 모드 토글 */

if(layoutModeBtn){

layoutModeBtn.addEventListener("click", () => {

document.body.classList.toggle("admin-mode");

try{ resizePeopleLayer(); }catch(err){}

});

}


/* 이름표 크기 슬라이더 */

if(personSizeSlider){

personSizeSlider.addEventListener("input", () => {

layoutConfig.personScale = Number(personSizeSlider.value);

applyLayoutConfig();

saveLayoutConfig();

});

}


/* 레이아웃 초기화 */

if(layoutResetBtn){

layoutResetBtn.addEventListener("click", () => {

if(!confirm("패널 크기와 이름표 크기를 기본값으로 되돌릴까요?")) return;

layoutConfig = Object.assign({}, DEFAULT_LAYOUT);

applyLayoutConfig();

saveLayoutConfig();

});

}


/* 가로 리사이즈 핸들 (좌↔중앙, 중앙↔대기인원, 대기인원↔출근현황) */

const panelByClass = {

"left-todo": leftEl,

"center-board": centerEl,

"staging-panel": stagingEl,

"right-panel": rightEl

};

const keyByClass = {

"left-todo": "left",

"center-board": "center",

"staging-panel": "staging",

"right-panel": "right"

};

document.querySelectorAll(".resize-h").forEach(handle => {

const prevKey = handle.dataset.targetPrev;
const nextKey = handle.dataset.targetNext;

const prevEl = panelByClass[prevKey];
const nextEl = panelByClass[nextKey];

if(!prevEl || !nextEl) return;

let startX = 0;
let startPrevPercent = 0;
let startNextPercent = 0;

const MIN_PERCENT = 8;

function onDown(e){

if(!document.body.classList.contains("admin-mode")) return;

const point = e.touches ? e.touches[0] : e;

startX = point.clientX;

startPrevPercent = layoutConfig[keyByClass[prevKey]];
startNextPercent = layoutConfig[keyByClass[nextKey]];

handle.classList.add("active");

document.addEventListener("mousemove", onMove);
document.addEventListener("mouseup", onUp);
document.addEventListener("touchmove", onMove, {passive:false});
document.addEventListener("touchend", onUp);

}

function onMove(e){

e.preventDefault();

const point = e.touches ? e.touches[0] : e;

const layoutWidth = mainLayout.getBoundingClientRect().width;

if(!layoutWidth) return;

const deltaPercent = ((point.clientX - startX) / layoutWidth) * 100;

let newPrev = startPrevPercent + deltaPercent;
let newNext = startNextPercent - deltaPercent;

if(newPrev < MIN_PERCENT){

const diff = MIN_PERCENT - newPrev;

newPrev = MIN_PERCENT;

newNext -= diff;

}

if(newNext < MIN_PERCENT){

const diff = MIN_PERCENT - newNext;

newNext = MIN_PERCENT;

newPrev -= diff;

}

layoutConfig[keyByClass[prevKey]] = Number(newPrev.toFixed(2));
layoutConfig[keyByClass[nextKey]] = Number(newNext.toFixed(2));

prevEl.style.width = layoutConfig[keyByClass[prevKey]] + "%";
nextEl.style.width = layoutConfig[keyByClass[nextKey]] + "%";

try{ resizePeopleLayer(); }catch(err){}

}

function onUp(){

document.removeEventListener("mousemove", onMove);
document.removeEventListener("mouseup", onUp);
document.removeEventListener("touchmove", onMove, {passive:false});
document.removeEventListener("touchend", onUp);

handle.classList.remove("active");

saveLayoutConfig();

}

handle.addEventListener("mousedown", onDown);
handle.addEventListener("touchstart", onDown, {passive:false});

});


/* 세로 리사이즈 핸들 (창고 이미지 ↔ 개발예정) */

const devNoteHandle = document.getElementById("devNoteResizeHandle");

if(devNoteHandle && devNoteEl){

let startY = 0;
let startHeight = 0;

const MIN_DEVNOTE = 60;
const MAX_DEVNOTE = 600;

function onDownV(e){

if(!document.body.classList.contains("admin-mode")) return;

const point = e.touches ? e.touches[0] : e;

startY = point.clientY;

startHeight = layoutConfig.devNoteHeight;

devNoteHandle.classList.add("active");

document.addEventListener("mousemove", onMoveV);
document.addEventListener("mouseup", onUpV);
document.addEventListener("touchmove", onMoveV, {passive:false});
document.addEventListener("touchend", onUpV);

}

function onMoveV(e){

e.preventDefault();

const point = e.touches ? e.touches[0] : e;

const deltaY = point.clientY - startY;

let newHeight = startHeight - deltaY;

if(newHeight < MIN_DEVNOTE) newHeight = MIN_DEVNOTE;
if(newHeight > MAX_DEVNOTE) newHeight = MAX_DEVNOTE;

layoutConfig.devNoteHeight = Math.round(newHeight);

devNoteEl.style.height = layoutConfig.devNoteHeight + "px";

try{ resizePeopleLayer(); }catch(err){}

}

function onUpV(){

document.removeEventListener("mousemove", onMoveV);
document.removeEventListener("mouseup", onUpV);
document.removeEventListener("touchmove", onMoveV, {passive:false});
document.removeEventListener("touchend", onUpV);

devNoteHandle.classList.remove("active");

saveLayoutConfig();

}

devNoteHandle.addEventListener("mousedown", onDownV);
devNoteHandle.addEventListener("touchstart", onDownV, {passive:false});

}

}catch(err){

console.error("관리자 모드(레이아웃 편집) 초기화 중 오류", err);

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
