class Account {
    constructor(id, type, name, category, amount) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.category = category;
        this.amount = amount;
    }
}

let data = [];
let nextId = 1;

function add() {
    let nameVal = name.value.trim();
    let amountVal = Number(amount.value);

    if (nameVal === "" || amountVal <= 0 || isNaN(amountVal)) {
        alert("กรุณากรอกชื่อรายการและจำนวนเงินให้ถูกต้อง");
        return;
    }

    data.push(new Account(
        nextId,
        type.value,
        nameVal,
        category.value,
        amountVal
    ));
    nextId++;

    name.value = "";
    amount.value = "";
    show();
}

function show() {
    let keyword = search.value.toLowerCase();
    list.innerHTML = "";

    let filtered = data.filter(x => x.name.toLowerCase().includes(keyword));
    let sorted = [...filtered].reverse(); // แสดงรายการล่าสุดก่อน

    sorted.forEach(x => {
        list.innerHTML += `
            <tr>
                <td>${x.id}</td>
                <td>${x.type === "income" ? "รายรับ" : "รายจ่าย"}</td>
                <td>${x.name}</td>
                <td>${x.category}</td>
                <td>${x.amount.toFixed(1)} บาท</td>
            </tr>`;
    });

    let income = data
        .filter(x => x.type === "income")
        .reduce((sum, x) => sum + x.amount, 0);

    let expense = data
        .filter(x => x.type === "expense")
        .reduce((sum, x) => sum + x.amount, 0);

    summary.innerHTML =
        `รายรับรวม: ${income.toFixed(1)} บาท | รายจ่ายรวม: ${expense.toFixed(1)} บาท | คงเหลือ: ${(income - expense).toFixed(1)} บาท`;
}

function clearData() {
    if (confirm("ต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
        data = [];
        nextId = 1;
        search.value = "";
        show();
    }
}

show();