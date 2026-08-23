const amountOne = document.getElementById('amount-one');
const amountTwo = document.getElementById('amount-two');

const currencyOne = document.getElementById('currency-one');
const currencyTwo = document.getElementById('currency-two');

const rateText = document.getElementById('rate');
const historyList = document.getElementById('history-list');

let rate = 0.02817;

// แปลงจากช่องที่ 1 → ช่องที่ 2
amountOne.addEventListener('input', () => {
    if (amountOne.value === '') {
        amountTwo.value = '';
        return;
    }

    amountTwo.value = (amountOne.value * rate).toFixed(2);
});

// แปลงจากช่องที่ 2 → ช่องที่ 1
amountTwo.addEventListener('input', () => {
    if (amountTwo.value === '') {
        amountOne.value = '';
        return;
    }

    amountOne.value = (amountTwo.value / rate).toFixed(2);
});

// แสดงอัตราแลกเปลี่ยน
function updateRate() {
    rateText.textContent =
        `1 ${currencyOne.value} = ${rate} ${currencyTwo.value}`;

    document.getElementById('last-updated').textContent =
        'อัปเดตล่าสุด: ' + new Date().toLocaleString('th-TH');
}

updateRate();

// ล้างข้อมูล
document.getElementById('clear-data').addEventListener('click', () => {
    amountOne.value = '';
    amountTwo.value = '';

    rateText.textContent = 'อัตราแลกเปลี่ยน: -';

    document.getElementById('last-updated').textContent =
        'อัปเดตล่าสุด: -';
});

// ประวัติ
let history = JSON.parse(localStorage.getItem('history')) || [];

function showHistory() {
    historyList.innerHTML = '';

    history.slice(0, 10).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        historyList.appendChild(li);
    });
}

function addHistory() {
    if (amountOne.value === '' || amountTwo.value === '') return;

    const item =
        `${amountOne.value} ${currencyOne.value} → ` +
        `${amountTwo.value} ${currencyTwo.value}`;

    history.unshift(item);
    history = history.slice(0, 10);

    localStorage.setItem('history', JSON.stringify(history));

    showHistory();
}

amountOne.addEventListener('change', addHistory);
amountTwo.addEventListener('change', addHistory);

// ล้างประวัติ
document.getElementById('clear-history').addEventListener('click', () => {
    history = [];
    localStorage.removeItem('history');
    showHistory();
});

showHistory();