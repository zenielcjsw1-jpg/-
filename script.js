/* ==========================
인원현황판 Lite v3.8
========================== */

const people = document.querySelectorAll(".person");
const board = document.getElementById("board");
const warehouse = document.getElementById("warehouse");
const peopleLayer = document.getElementById("peopleLayer");
const stagingArea = document.getElementById("stagingArea");
const attendanceStagingArea = document.getElementById("attendanceStagingArea");

/* 저장소 키 (다른 코드보다 먼저 정의하여 항상 안전하게 참조 가능) */
const STORAGE_KEY = "personnelBoardLite_v38";   // 실시간 자동 저장(자동 배치 유지용)
const NOTE_KEY = "personnelBoardLite_note";
const SAVES_KEY = "personnelBoardLite_saves_v38"; // 저장 버튼으로 만든 날짜별 저장 목록

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

    loadAutosave(true);

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

try{ updateAttendance(); }catch(err){}

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

/* 대기인원 패널에 소속되었음을 기록 (창고 이미지로 이동해도 유지되는 값) */
person.dataset.group = "waiting";

if(persist !== false){

try{ saveStatusOnly(); }catch(err){ console.error("배치 저장 중 오류", err); }

}

try{ updateAttendance(); }catch(err){}

try{ updateStagingCounts(); }catch(err){}

}

/* 드래그 핸들러 연결 */
people.forEach((person) => {

    enableDrag(person);

});

/* 초기 소속 그룹 기록 (페이지 로드 시점의 실제 위치 기준) */
document.querySelectorAll(".person").forEach(person=>{

person.dataset.group =
(person.parentElement && person.parentElement.id === "stagingArea")
? "waiting"
: "attendance";

});

/* 출근인원/대기인원 패널 제목 옆 인원수 갱신
   (창고 이미지 배치 여부와 무관하게, 두 패널 간 이동에만 반응) */
function updateStagingCounts(){

let attendanceGroupCount = 0;

let waitingGroupCount = 0;

document.querySelectorAll(".person").forEach(person=>{

if(person.dataset.group === "waiting"){

waitingGroupCount++;

}else{

attendanceGroupCount++;

}

});

const aEl = document.getElementById("attendanceStagingCount");

if(aEl) aEl.innerText = attendanceGroupCount;

const wEl = document.getElementById("waitingStagingCount");

if(wEl) wEl.innerText = waitingGroupCount;

}

try{ updateStagingCounts(); }catch(err){}

function enableDrag(target){

let startClientX = 0;
let startClientY = 0;

let grabOffsetX = 0;
let grabOffsetY = 0;

let dragModeActive = false;

function dragStart(e){

/* 모바일(768px 이하)에서는 배치 편집을 비활성화 - PC에서만 위치를 옮길 수 있음.
   여기서 그냥 return하면 이동 관련 리스너가 붙지 않아 일반 탭(클릭)으로
   처리되어, 이름표를 탭했을 때 상태 변경 팝업은 정상적으로 열림 */

if(window.innerWidth <= 768){

return;

}

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

}else if(attendanceStagingArea && isPointInRect(clientX, clientY, attendanceStagingArea.getBoundingClientRect())){

moveToAttendanceStaging(target);

}else{

moveToStaging(target);

}

}

target.addEventListener("mousedown",dragStart);
target.addEventListener("touchstart",dragStart,{passive:false});

}

/* 이름표를 출근인원(대기 패널 첫번째 칸)으로 이동 */
function moveToAttendanceStaging(person, persist){

attendanceStagingArea.appendChild(person);

person.classList.remove("on-board");
person.classList.add("staging");

person.style.position = "";
person.style.left = "";
person.style.top = "";

delete person.dataset.x;
delete person.dataset.y;

/* 출근인원 패널에 소속되었음을 기록 (창고 이미지로 이동해도 유지되는 값) */
person.dataset.group = "attendance";

if(persist !== false){

try{ saveStatusOnly(); }catch(err){ console.error("배치 저장 중 오류", err); }

}

try{ updateAttendance(); }catch(err){}

try{ updateStagingCounts(); }catch(err){}

}

/* ==========================
배치/상태 데이터 만들기 (저장·자동저장 공용)
========================== */

function buildSaveData(){

const data = [];

document.querySelectorAll(".person").forEach(person => {

const onBoard = person.classList.contains("on-board");

const inAttendance = !onBoard && person.parentElement && person.parentElement.id === "attendanceStagingArea";

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

name: person.dataset.name,

isCopy: person.dataset.isCopy === "1",

location: onBoard ? "board" : (inAttendance ? "attendance" : "staging"),

group: person.dataset.group === "waiting" ? "waiting" : "attendance",

x: x,

y: y,

status:
statusMap[person.dataset.id],

employment:
employmentMap[person.dataset.id]

});

});

return data;

}

/* 저장된 배치/상태 데이터를 화면에 적용 */
function applySaveData(data){

if(!Array.isArray(data)) return;

data.forEach(item => {

try{


let person =
document.querySelector(
'.person[data-id="' + item.id + '"]'
);


/* 저장 당시엔 있었지만 지금은 DOM에 없는 인원(=추가로 생성됐던 이름표)은
   대기 인원 칸에 다시 만들어 복원한다 */

if(!person && item.name){

person = createPersonElement(item.id, item.name);

stagingArea.appendChild(person);

setupPersonBehaviors(person);

}


if (!person) return;


/* 복사본 여부 복원 (출근현황/정규비정규 카운팅 제외 대상 표시) */

if(item.isCopy){

person.dataset.isCopy = "1";

}else{

delete person.dataset.isCopy;

}


/* 위치(대기영역/출근인원/온보드) 복원 */

const location =
item.location === "board" ? "board" :
(item.location === "attendance" ? "attendance" : "staging");

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

}else if(location === "attendance" && attendanceStagingArea){

attendanceStagingArea.appendChild(person);

person.classList.remove("on-board");
person.classList.add("staging");

person.style.position = "";
person.style.left = "";
person.style.top = "";

delete person.dataset.x;
delete person.dataset.y;

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


/* 소속 그룹 복원 (출근인원/대기인원 패널 인원수 집계용, 창고 이미지 배치와 무관) */

person.dataset.group =
item.group === "waiting" ? "waiting" :
(item.group === "attendance" ? "attendance" : (location === "staging" ? "waiting" : "attendance"));


/* 상태 복원 (알 수 없는 상태값은 '주간'으로 안전하게 처리) */

const restoredStatus =
(item.status && statusConfig[item.status])
? item.status
: "주간";

statusMap[item.id] = restoredStatus;

updatePersonColor(
person,
restoredStatus
);


/* 정규/비정규 복원 (알 수 없는 값은 '정규'로 안전하게 처리) */

const restoredEmployment =
(item.employment === "비정규") ? "비정규" : "정규";

employmentMap[item.id] = restoredEmployment;

}catch(err){

console.error("한 명의 데이터를 복원하는 중 오류가 발생해 건너뜁니다.", err);

}

});


try{

updateAttendance();

}catch(err){

console.error("출근 현황 갱신 중 오류", err);

}

try{

updateStagingCounts();

}catch(err){}

try{

updateEmploymentCounts();

}catch(err){}

}

/* ==========================
자동 저장 (배치를 옮기거나 상태를 바꿀 때마다 조용히 저장)
========================== */

function loadAutosave(silent) {

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


applySaveData(data);

}

/* 초기화 */

function resetPositions() {


document.querySelectorAll(".person")
.forEach((person) => {


moveToAttendanceStaging(person, false);



statusMap[person.dataset.id] = "주간";


updatePersonColor(

person,

"주간"

);


});


updateAttendance();


localStorage.removeItem(STORAGE_KEY);


}

/* ==========================
저장(날짜별 저장 목록) / 불러오기 / 삭제
========================== */

function loadSaves(){

try{

const raw = localStorage.getItem(SAVES_KEY);

const parsed = raw ? JSON.parse(raw) : [];

return Array.isArray(parsed) ? parsed : [];

}catch(err){

return [];

}

}

function writeSaves(saves){

localStorage.setItem(SAVES_KEY, JSON.stringify(saves));

}

function formatSaveLabel(date){

const y = date.getFullYear();

const m = date.getMonth() + 1;

const d = date.getDate();

const day = [
"일","월","화","수","목","금","토"
][date.getDay()];

const hh = String(date.getHours()).padStart(2, "0");

const mm = String(date.getMinutes()).padStart(2, "0");

return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")} (${day}) ${hh}:${mm}`;

}

/* 저장 버튼: 현재 일자/시간을 제목으로 새 저장본을 만듦 */
function savePositions(){

const now = new Date();

const entry = {

id: String(now.getTime()),

label: formatSaveLabel(now),

data: buildSaveData()

};

const saves = loadSaves();

saves.unshift(entry);

writeSaves(saves);

/* 실시간 자동 저장도 함께 최신화 */

try{ saveStatusOnly(); }catch(err){}

saveNote();


alert("저장되었습니다: " + entry.label);

}

function renderSaveList(){

const listEl = document.getElementById("saveList");

if(!listEl) return;

const saves = loadSaves();

listEl.innerHTML = "";

if(saves.length === 0){

const empty = document.createElement("p");

empty.className = "save-empty";

empty.innerText = "저장된 데이터가 없습니다.";

listEl.appendChild(empty);

return;

}

saves.forEach(entry => {

const row = document.createElement("div");

row.className = "save-item";


const label = document.createElement("span");

label.className = "save-label";

label.innerText = entry.label;

label.addEventListener("click", () => {

applySaveData(entry.data);

document.getElementById("loadPopup").style.display = "none";

});


const delBtn = document.createElement("button");

delBtn.className = "save-delete-btn";

delBtn.innerText = "✕";

delBtn.addEventListener("click", (e) => {

e.stopPropagation();

if(!confirm("이 저장 내용을 삭제할까요?")) return;

const remaining = loadSaves().filter(s => s.id !== entry.id);

writeSaves(remaining);

renderSaveList();

});


row.appendChild(label);

row.appendChild(delBtn);

listEl.appendChild(row);

});

}

/* 버튼 연결 */

document
.getElementById("saveBtn")
.addEventListener("click", savePositions);

document
.getElementById("loadBtn")
.addEventListener("click", () => {

renderSaveList();

document.getElementById("loadPopup").style.display = "flex";

});

document
.getElementById("closeLoadPopup")
.addEventListener("click", () => {

document.getElementById("loadPopup").style.display = "none";

});

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
const vacationPeople = [];
const sickleavePeople = [];
const earlyleavePeople = [];



const statusMap = {};

/* 정규/비정규 구분 (출근현황 상태와는 별개로 관리) */
const employmentMap = {};

const regularPeople = [];
const irregularPeople = [];

/* ==========================
   상태 디자인 설정
========================== */

const statusConfig = {

"주간":{
    color:"#D8F3DC",
    icon:"🔆"
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
    color:"#FFD8A8",
    icon:"①",
    iconColor:"#C2650B"
},

"사무실":{
    color:"#FCE7F3",
    icon:"💻"
},

"휴가":{
    color:"#FDE68A",
    icon:"🏝️"
},

"병가":{
    color:"#D9DEE3",
    icon:"➕",
    iconColor:"#E03131"
},

"결근":{
    color:"#FFC9C9",
    icon:"⛔"
},

"조퇴":{
    color:"#BAE6FD",
    icon:"🚗"
},

"기타":{
    color:"#E5E7EB",
    icon:"📌"

}

};

/* 근무 성격의 상태 (더블클릭 순환 판별용) */
const WORK_STATUSES = ["주간", "석간", "광역", "1층", "사무실"];







document.querySelectorAll(".person").forEach(person=>{

statusMap[person.dataset.id]="주간";

updatePersonColor(person,"주간");


/* 정규/비정규 기본값은 '정규' */

employmentMap[person.dataset.id]="정규";

});

try{

updateAttendance();

}catch(err){

console.error("초기 출근 현황 계산 중 오류", err);

}

try{

updateEmploymentCounts();

}catch(err){

console.error("정규/비정규 인원 집계 중 오류", err);

}

function updateAttendance(){

const total=[];

const day=[];

const seokgan=[];

const gwangyeok=[];

const floor1=[];

const office=[];

const absent=[];

const vacation=[];

const sickleave=[];

const earlyleave=[];

let waitingCount = 0;

document.querySelectorAll(".person").forEach(person=>{

/* 복사본 이름표는 단순 시각적 배치용이므로 출근현황 집계에서 완전히 제외 */

if(person.dataset.isCopy === "1"){

return;

}

/* 대기 인원(두번째 칸)에 있는 인원은 출근현황 집계에서 제외 */

const isWaiting =
person.parentElement &&
person.parentElement.id === "stagingArea";

if(isWaiting){

waitingCount++;

return;

}

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

}else if(state==="결근"){

absent.push(name);

}else if(state==="휴가"){

vacation.push(name);

}else if(state==="병가"){

sickleave.push(name);

}else if(state==="조퇴"){

earlyleave.push(name);

}

});

function setCountText(id, value){

const el = document.getElementById(id);

if(el) el.innerText = value;

}

setCountText("totalCount", total.length);
setCountText("waitingCount", waitingCount);
setCountText("dayCount", day.length);
setCountText("seokganCount", seokgan.length);
setCountText("gwangyeokCount", gwangyeok.length);
setCountText("floor1Count", floor1.length);
setCountText("officeCount", office.length);
setCountText("absentCount", absent.length);
setCountText("vacationCount", vacation.length);
setCountText("sickleaveCount", sickleave.length);
setCountText("earlyleaveCount", earlyleave.length);

  totalPeople.length = 0;

dayPeople.length = 0;

seokganPeople.length = 0;

gwangyeokPeople.length = 0;

floor1People.length = 0;

officePeople.length = 0;

absentPeople.length = 0;

vacationPeople.length = 0;

sickleavePeople.length = 0;

earlyleavePeople.length = 0;

totalPeople.push(...total);

dayPeople.push(...day);

seokganPeople.push(...seokgan);

gwangyeokPeople.push(...gwangyeok);

floor1People.push(...floor1);

officePeople.push(...office);

absentPeople.push(...absent);

vacationPeople.push(...vacation);

sickleavePeople.push(...sickleave);

earlyleavePeople.push(...earlyleave);

}

/* 정규/비정규 인원수 집계 (출근현황 상태·위치와 무관하게 employmentMap 기준으로만 계산) */
function updateEmploymentCounts(){

const regular = [];

const irregular = [];

document.querySelectorAll(".person").forEach(person=>{

/* 복사본 이름표는 단순 시각적 배치용이므로 정규/비정규 집계에서 완전히 제외 */

if(person.dataset.isCopy === "1"){

return;

}

const value = employmentMap[person.dataset.id];

const name = person.dataset.name || person.innerText;

if(value === "비정규"){

irregular.push(name);

}else{

regular.push(name);

}

});

const rEl = document.getElementById("regularCount");

if(rEl) rEl.innerText = regular.length;

const iEl = document.getElementById("irregularCount");

if(iEl) iEl.innerText = irregular.length;

regularPeople.length = 0;

irregularPeople.length = 0;

regularPeople.push(...regular);

irregularPeople.push(...irregular);

}

document.querySelectorAll(".person").forEach(person=>{

person.addEventListener("dblclick",()=>{

const current=statusMap[person.dataset.id];

let next="주간";

if(WORK_STATUSES.includes(current)){

next="결근";

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

/* 팝업 상단 이름 옆에 (정규)/(비정규) 표시 */
function updateStatusTitleDisplay(person){

const name =
person.dataset.name || person.innerText;

const employment =
employmentMap[person.dataset.id] === "비정규" ? "비정규" : "정규";

document.getElementById("statusTitle").innerText =
`${name} (${employment})`;

}

document.querySelectorAll(".person").forEach(person=>{

person.addEventListener("click",()=>{

if(isDragging){

isDragging = false;

return;

}

selectedPerson = person;

updateStatusTitleDisplay(person);

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

/* 정규/비정규 전환 버튼 (팝업을 닫지 않고 즉시 토글) */

const employmentToggleBtn = document.getElementById("employmentToggleBtn");

if(employmentToggleBtn){

employmentToggleBtn.addEventListener("click", () => {

if(!selectedPerson) return;

const current =
employmentMap[selectedPerson.dataset.id] === "비정규" ? "비정규" : "정규";

const next =
current === "정규" ? "비정규" : "정규";

employmentMap[selectedPerson.dataset.id] = next;

updateStatusTitleDisplay(selectedPerson);

try{ updateEmploymentCounts(); }catch(err){}

try{ saveStatusOnly(); }catch(err){}

});

}

function updatePersonColor(person,status){

const config =
statusConfig[status];


if(!config) return;


/* 상태 색상을 이름표 배경에 직접 적용, 테두리는 항상 중립 톤으로 고정 */

person.style.background =
config.color;


person.style.borderColor =
"#ffffff";


/* 아이콘 + 이름 표시 */

const name =
person.dataset.name ||
person.innerText;


person.dataset.name = name;


const iconColorStyle =
config.iconColor
? ` style="color:${config.iconColor}"`
: "";


person.innerHTML =
`
<span class="status-icon"${iconColorStyle}>
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

updateStatusTitleDisplay(person);

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

document.getElementById("vacationBox").onclick=function(){

openPopup("휴가",vacationPeople);

};

document.getElementById("sickleaveBox").onclick=function(){

openPopup("병가",sickleavePeople);

};

document.getElementById("earlyleaveBox").onclick=function(){

openPopup("조퇴",earlyleavePeople);

};

document.getElementById("regularBox").onclick=function(){

openPopup("정규",regularPeople);

};

document.getElementById("irregularBox").onclick=function(){

openPopup("비정규",irregularPeople);

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
상태만 저장 (자동 저장 - STORAGE_KEY)
========================== */
function saveStatusOnly(){

localStorage.setItem(

STORAGE_KEY,

JSON.stringify(buildSaveData())

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


const numCol = document.createElement("div");

numCol.className = "todo-num-col";


const num = document.createElement("span");

num.className = "todo-num";

num.innerText = index + 1;


const deleteBtn = document.createElement("button");

deleteBtn.className = "todo-delete-mini";

deleteBtn.innerText = "✕";

deleteBtn.addEventListener("click", () => {

if(!confirm("선택한 업무를 삭제하시겠습니까?")) return;

todoItems.splice(index, 1);

saveTodos();

renderTodos();

});


numCol.appendChild(num);

numCol.appendChild(deleteBtn);


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


item.appendChild(numCol);

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

if(e.key === "Enter" && !e.altKey){

e.preventDefault();

addTodo();

}

/* Alt+Enter는 기본 동작(줄바꿈)을 그대로 둠 */

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

const LAYOUT_KEY = "personnelBoardLite_layout_v38";

const DEFAULT_LAYOUT = {

left: 12,
center: 62,
staging: 12,
right: 14,
devNoteHeight: 36,
personScale: 85,
leftNoteHeight: 220,
stagingAttendanceRatio: 90,
rightPanelRatio: 90

};

const mainLayout = document.querySelector(".main-layout");

const leftEl = document.querySelector(".left-todo");
const centerEl = document.querySelector(".center-board");
const stagingEl = document.querySelector(".staging-panel");
const rightEl = document.querySelector(".right-panel");
const devNoteEl = document.querySelector(".dev-note");
const leftNoteEl = document.querySelector(".left-todo .note-panel");
const leftSplitHandle = document.getElementById("leftSplitResizeHandle");

const attendanceSubEl = document.querySelector(".attendance-sub");
const waitingSubEl = document.querySelector(".waiting-sub");
const stagingSplitHandle = document.getElementById("stagingSplitResizeHandle");

const rightTopSubEl = document.querySelector(".right-top-sub");
const rightBottomSubEl = document.querySelector(".right-bottom-sub");
const rightSplitHandle = document.getElementById("rightSplitResizeHandle");

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

/* 폭 합계가 비정상(옛 버전 잔여값 등)이면 기본값으로 안전하게 복구 */

const widthSum =
(Number(layoutConfig.left)||0) +
(Number(layoutConfig.center)||0) +
(Number(layoutConfig.staging)||0) +
(Number(layoutConfig.right)||0);

if(widthSum < 96 || widthSum > 104){

layoutConfig = Object.assign({}, DEFAULT_LAYOUT);

}

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

if(leftNoteEl) leftNoteEl.style.height = layoutConfig.leftNoteHeight + "px";

if(attendanceSubEl) attendanceSubEl.style.flex = layoutConfig.stagingAttendanceRatio + " 1 0";

if(waitingSubEl) waitingSubEl.style.flex = (100 - layoutConfig.stagingAttendanceRatio) + " 1 0";

if(rightTopSubEl) rightTopSubEl.style.flex = layoutConfig.rightPanelRatio + " 1 0";

if(rightBottomSubEl) rightBottomSubEl.style.flex = (100 - layoutConfig.rightPanelRatio) + " 1 0";

/* 모바일 화면(768px 이하)에서는 관리자 슬라이더 값 대신
   화면 폭 기준으로 이름표 크기를 자동 계산 */

const isMobileWidth = window.innerWidth <= 768;

let scale;

if(isMobileWidth){

const MIN_W = 320;
const MAX_W = 768;

const MIN_SCALE = 0.62;
const MAX_SCALE = 0.95;

let ratio = (window.innerWidth - MIN_W) / (MAX_W - MIN_W);

ratio = Math.max(0, Math.min(1, ratio));

scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * ratio;

}else{

scale = layoutConfig.personScale / 100;

}

document.documentElement.style.setProperty("--person-w", (95*scale).toFixed(1)+"px");
document.documentElement.style.setProperty("--person-h", (38*scale).toFixed(1)+"px");
document.documentElement.style.setProperty("--person-font", (14*scale).toFixed(1)+"px");

/* 관리자 슬라이더는 데스크탑 값 기준으로만 표시 (모바일 자동 스케일과 무관) */

if(personSizeSlider) personSizeSlider.value = layoutConfig.personScale;

if(personSizeValue) personSizeValue.innerText = layoutConfig.personScale + "%";


try{ resizePeopleLayer(); }catch(err){}

}

loadLayoutConfig();

applyLayoutConfig();

/* 화면 폭이 모바일 ↔ 데스크탑 기준을 넘나들 때마다 이름표 크기 재계산 */

window.addEventListener("resize", () => {

try{ applyLayoutConfig(); }catch(err){}

});


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

const MIN_DEVNOTE = 24;
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


/* 세로 리사이즈 핸들 (오늘 할 일 ↔ 특이사항) */

if(leftSplitHandle && leftNoteEl){

let startY2 = 0;
let startHeight2 = 0;

const MIN_LEFTNOTE = 60;
const MAX_LEFTNOTE = 700;

function onDownLN(e){

if(!document.body.classList.contains("admin-mode")) return;

const point = e.touches ? e.touches[0] : e;

startY2 = point.clientY;

startHeight2 = layoutConfig.leftNoteHeight;

leftSplitHandle.classList.add("active");

document.addEventListener("mousemove", onMoveLN);
document.addEventListener("mouseup", onUpLN);
document.addEventListener("touchmove", onMoveLN, {passive:false});
document.addEventListener("touchend", onUpLN);

}

function onMoveLN(e){

e.preventDefault();

const point = e.touches ? e.touches[0] : e;

const deltaY = point.clientY - startY2;

let newHeight = startHeight2 - deltaY;

if(newHeight < MIN_LEFTNOTE) newHeight = MIN_LEFTNOTE;
if(newHeight > MAX_LEFTNOTE) newHeight = MAX_LEFTNOTE;

layoutConfig.leftNoteHeight = Math.round(newHeight);

leftNoteEl.style.height = layoutConfig.leftNoteHeight + "px";

}

function onUpLN(){

document.removeEventListener("mousemove", onMoveLN);
document.removeEventListener("mouseup", onUpLN);
document.removeEventListener("touchmove", onMoveLN, {passive:false});
document.removeEventListener("touchend", onUpLN);

leftSplitHandle.classList.remove("active");

saveLayoutConfig();

}

leftSplitHandle.addEventListener("mousedown", onDownLN);
leftSplitHandle.addEventListener("touchstart", onDownLN, {passive:false});

}


/* 세로 리사이즈 핸들 (출근인원 ↔ 대기인원) */

if(stagingSplitHandle && attendanceSubEl && waitingSubEl){

let startY3 = 0;
let startRatio3 = 90;

const MIN_RATIO = 20;
const MAX_RATIO = 95;

function onDownSR(e){

if(!document.body.classList.contains("admin-mode")) return;

const point = e.touches ? e.touches[0] : e;

startY3 = point.clientY;

startRatio3 = layoutConfig.stagingAttendanceRatio;

stagingSplitHandle.classList.add("active");

document.addEventListener("mousemove", onMoveSR);
document.addEventListener("mouseup", onUpSR);
document.addEventListener("touchmove", onMoveSR, {passive:false});
document.addEventListener("touchend", onUpSR);

}

function onMoveSR(e){

e.preventDefault();

const point = e.touches ? e.touches[0] : e;

const panelEl = document.querySelector(".staging-panel");

const panelHeight = panelEl ? panelEl.getBoundingClientRect().height : 0;

if(!panelHeight) return;

const deltaRatio = ((point.clientY - startY3) / panelHeight) * 100;

let newRatio = startRatio3 + deltaRatio;

if(newRatio < MIN_RATIO) newRatio = MIN_RATIO;
if(newRatio > MAX_RATIO) newRatio = MAX_RATIO;

layoutConfig.stagingAttendanceRatio = Number(newRatio.toFixed(1));

attendanceSubEl.style.flex = layoutConfig.stagingAttendanceRatio + " 1 0";

waitingSubEl.style.flex = (100 - layoutConfig.stagingAttendanceRatio) + " 1 0";

}

function onUpSR(){

document.removeEventListener("mousemove", onMoveSR);
document.removeEventListener("mouseup", onUpSR);
document.removeEventListener("touchmove", onMoveSR, {passive:false});
document.removeEventListener("touchend", onUpSR);

stagingSplitHandle.classList.remove("active");

saveLayoutConfig();

}

stagingSplitHandle.addEventListener("mousedown", onDownSR);
stagingSplitHandle.addEventListener("touchstart", onDownSR, {passive:false});

}


/* 세로 리사이즈 핸들 (출근 현황 ↔ 정규/비정규) */

if(rightSplitHandle && rightTopSubEl && rightBottomSubEl){

let startY4 = 0;
let startRatio4 = 90;

const MIN_RIGHT_RATIO = 20;
const MAX_RIGHT_RATIO = 95;

function onDownRR(e){

if(!document.body.classList.contains("admin-mode")) return;

const point = e.touches ? e.touches[0] : e;

startY4 = point.clientY;

startRatio4 = layoutConfig.rightPanelRatio;

rightSplitHandle.classList.add("active");

document.addEventListener("mousemove", onMoveRR);
document.addEventListener("mouseup", onUpRR);
document.addEventListener("touchmove", onMoveRR, {passive:false});
document.addEventListener("touchend", onUpRR);

}

function onMoveRR(e){

e.preventDefault();

const point = e.touches ? e.touches[0] : e;

const panelHeight = rightEl ? rightEl.getBoundingClientRect().height : 0;

if(!panelHeight) return;

const deltaRatio = ((point.clientY - startY4) / panelHeight) * 100;

let newRatio = startRatio4 + deltaRatio;

if(newRatio < MIN_RIGHT_RATIO) newRatio = MIN_RIGHT_RATIO;
if(newRatio > MAX_RIGHT_RATIO) newRatio = MAX_RIGHT_RATIO;

layoutConfig.rightPanelRatio = Number(newRatio.toFixed(1));

rightTopSubEl.style.flex = layoutConfig.rightPanelRatio + " 1 0";

rightBottomSubEl.style.flex = (100 - layoutConfig.rightPanelRatio) + " 1 0";

}

function onUpRR(){

document.removeEventListener("mousemove", onMoveRR);
document.removeEventListener("mouseup", onUpRR);
document.removeEventListener("touchmove", onMoveRR, {passive:false});
document.removeEventListener("touchend", onUpRR);

rightSplitHandle.classList.remove("active");

saveLayoutConfig();

}

rightSplitHandle.addEventListener("mousedown", onDownRR);
rightSplitHandle.addEventListener("touchstart", onDownRR, {passive:false});

}

}catch(err){

console.error("관리자 모드(레이아웃 편집) 초기화 중 오류", err);

}


/* ==========================
인원 추가 / 삭제 기능 (v3.8 상세 수정)
- 이름표 클릭 팝업 최하단 "삭제" 버튼 → 확인 후 완전히 제거 (퇴사자 처리)
- 대기 인원 칸 첫 번째 자리 "인원 추가" 버튼 → 이름 입력 시 새 이름표를
  대기 인원 칸에 즉시 배치 (신규 입사자 처리)
- 독립 기능이므로 다른 영역 오류의 영향을 받지 않도록 try/catch로 감쌈
========================== */

/* 새 이름표 DOM 요소를 만드는 부분 (신규 생성 시 / 저장 데이터 복원 시 공용으로 사용) */
function createPersonElement(id, name){

const person = document.createElement("div");

person.className = "person staging";

person.dataset.id = id;

person.dataset.name = name;

person.innerText = name;

return person;

}

/* 새로 만든 이름표에 기존 인원과 동일한 동작(드래그/클릭/더블클릭/상태)을 연결 */
function setupPersonBehaviors(person){

person.dataset.group = "waiting";

enableDrag(person);

statusMap[person.dataset.id] = statusMap[person.dataset.id] || "주간";

updatePersonColor(person, statusMap[person.dataset.id]);

employmentMap[person.dataset.id] = employmentMap[person.dataset.id] || "정규";

person.addEventListener("dblclick", () => {

const current = statusMap[person.dataset.id];

let next = "주간";

if(WORK_STATUSES.includes(current)){

next = "결근";

}else{

next = "주간";

}

statusMap[person.dataset.id] = next;

updatePersonColor(person, next);

updateAttendance();

});

person.addEventListener("click", () => {

if(isDragging){

isDragging = false;

return;

}

selectedPerson = person;

updateStatusTitleDisplay(person);

document.getElementById("statusPopup").style.display = "flex";

});

}

try{

const addPersonBtn = document.getElementById("addPersonBtn");
const deletePersonBtn = document.getElementById("deletePersonBtn");
const copyPersonBtn = document.getElementById("copyPersonBtn");

/* 인원 추가 버튼: 이름 입력 후 대기 인원 칸에 새 이름표 생성 */
if(addPersonBtn){

addPersonBtn.addEventListener("click", () => {

const input = prompt("추가할 인원의 이름을 입력하세요.");

if(!input) return;

const name = input.trim();

if(name === "") return;

const newId = "new" + Date.now();

const person = createPersonElement(newId, name);

/* 버튼 바로 다음 자리(대기 인원 칸 맨 위)에 배치 */

if(addPersonBtn.nextSibling){

stagingArea.insertBefore(person, addPersonBtn.nextSibling);

}else{

stagingArea.appendChild(person);

}

setupPersonBehaviors(person);

try{ updateAttendance(); }catch(err){}

try{ updateStagingCounts(); }catch(err){}

try{ updateEmploymentCounts(); }catch(err){}

try{ saveStatusOnly(); }catch(err){}

});

}

/* 복사 버튼: 같은 이름의 이름표를 하나 더 만들어 대기 인원 칸에 추가
   (출근현황/정규비정규 카운팅에서는 완전히 제외되는 단순 시각적 배치용) */
if(copyPersonBtn){

copyPersonBtn.addEventListener("click", () => {

if(!selectedPerson) return;

const originalId = selectedPerson.dataset.id;

const name = selectedPerson.dataset.name || selectedPerson.innerText;

const originalStatus = statusMap[originalId] || "주간";

const newId = "copy" + Date.now();

const person = createPersonElement(newId, name);

person.dataset.isCopy = "1";

if(addPersonBtn && addPersonBtn.nextSibling){

stagingArea.insertBefore(person, addPersonBtn.nextSibling);

}else{

stagingArea.appendChild(person);

}

setupPersonBehaviors(person);

/* 원본과 같은 상태색으로 시작 (카운팅에는 반영되지 않음) */

statusMap[newId] = originalStatus;

updatePersonColor(person, originalStatus);

document.getElementById("statusPopup").style.display = "none";

selectedPerson = null;

try{ updateAttendance(); }catch(err){}

try{ updateStagingCounts(); }catch(err){}

try{ updateEmploymentCounts(); }catch(err){}

try{ saveStatusOnly(); }catch(err){}

});

}

/* 삭제 버튼: 확인 팝업 후 이름표를 완전히 제거 (퇴사자 처리용) */
if(deletePersonBtn){

deletePersonBtn.addEventListener("click", () => {

if(!selectedPerson) return;

if(!confirm("정말 삭제하시겠습니까?")) return;

const id = selectedPerson.dataset.id;

selectedPerson.remove();

delete statusMap[id];

delete employmentMap[id];

document.getElementById("statusPopup").style.display = "none";

selectedPerson = null;

try{ updateAttendance(); }catch(err){}

try{ updateStagingCounts(); }catch(err){}

try{ updateEmploymentCounts(); }catch(err){}

try{ saveStatusOnly(); }catch(err){}

});

}

}catch(err){

console.error("인원 추가/삭제 기능 초기화 중 오류", err);

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
