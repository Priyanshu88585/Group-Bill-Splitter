let names = [];
let currentShareLink = "";

function toggleDropdown(id) {
    document.getElementById('downloadMenu').classList.add('hidden');
    document.getElementById('shareMenu').classList.add('hidden');
    document.getElementById(id).classList.toggle('hidden');
}

function generateNameInputs() {
    const count = parseInt(document.getElementById('peopleCount').value);
    const nameFields = document.getElementById('nameFields');
    nameFields.innerHTML = '';
    for (let i = 0; i < count; i++) {
        nameFields.innerHTML += `<input type="text" class="w-full border rounded-lg p-2" placeholder="Person ${i + 1} Name" required>`;
    }
    document.getElementById('namesForm').classList.remove('hidden');
}

function generatePurposeInputs() {
    const inputs = document.querySelectorAll('#nameFields input');
    names = [];
    inputs.forEach(input => names.push(input.value.trim() || "Unnamed Person"));
    document.getElementById('purposeFields').innerHTML = '';
    addPurposeBox();
    document.getElementById('paymentForm').classList.remove('hidden');
}

function addPurposeBox() {
    const purposeFields = document.getElementById('purposeFields');
    const box = document.createElement('div');
    box.className = "border rounded-lg p-3 bg-gray-50";

    let html = `<div class="flex items-center mb-2">
    <input type="text" class="flex-1 border rounded-lg p-2 mr-2 purpose" placeholder="Purpose e.g. Food, Travel" required>
    <select class="category border rounded-lg p-2 mr-2">
        <option value="Food">Food 🍽️</option>
        <option value="Travel">Travel 🚗</option>
        <option value="Shopping">Shopping 🛍️</option>
        <option value="Hotel">Hotel 🏨</option>
        <option value="Other">Other ✏️</option>
    </select>
    <button type="button" onclick="removePurpose(this)" class="text-red-500 hover:text-red-700 text-xl">🗑️</button>
    </div><div class="grid grid-cols-${names.length} gap-2">`;

    names.forEach(name => {
        html += `<input type="number" class="w-full border rounded-lg p-2 amount" placeholder="${name} paid" required>`;
    });

    html += `</div><div class="mb-2"><label class="font-semibold">Who is involved?</label><div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 involved">`;
    names.forEach((name, idx) => {
        html += `<label class="flex items-center space-x-1"><input type="checkbox" data-idx="${idx}" checked> ${name}</label>`;
    });

    box.innerHTML = html;
    purposeFields.appendChild(box);
    updateCategoryFilter();
}

function removePurpose(btn) {
    btn.closest('.border').remove();
    updateCategoryFilter();
    calculateSettlement();
}

function updateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    const categories = Array.from(document.querySelectorAll('.category')).map(c => c.value);
    const unique = [...new Set(categories)];
    filter.innerHTML = `<option value="all">All Categories</option>`;
    unique.forEach(c => {
        filter.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

function showResult() {
    document.getElementById('result').classList.remove('hidden');
    document.getElementById('actionButtons').classList.remove('hidden');
    calculateSettlement();
}

function calculateSettlement() {
    const currency = document.getElementById('currency').value;
    const selectedCategory = document.getElementById('categoryFilter').value;
    let totals = Array(names.length).fill(0);
    let shares = Array(names.length).fill(0);

    document.querySelectorAll('#purposeFields > div').forEach(p => {
        const category = p.querySelector('.category').value;
        if (selectedCategory !== "all" && category !== selectedCategory) return;

        const involved = [...p.querySelectorAll('.involved input')].filter(c => c.checked).map(c => parseInt(c.dataset.idx));
        const amounts = [...p.querySelectorAll('.amount')].map(a => parseFloat(a.value) || 0);
        const totalPaid = amounts.reduce((a, b) => a + b, 0);
        involved.forEach(i => shares[i] += totalPaid / involved.length);
        amounts.forEach((amt, i) => totals[i] += amt);
    });

    const tbody = document.querySelector('#settlementTable tbody');
    tbody.innerHTML = '';
    const totalAllPaid = totals.reduce((a, b) => a + b, 0);
    document.getElementById('totalPaid').innerHTML = `<p>Total Paid: <strong>${currency}${totalAllPaid.toFixed(2)}</strong></p>`;

    let balances = [];
    names.forEach((name, idx) => {
        const diff = totals[idx] - shares[idx];
        balances.push({ name: name, amount: diff });
        const bal = diff > 0 ? `+${diff.toFixed(2)}` : diff < 0 ? `-${Math.abs(diff).toFixed(2)}` : '0';
        const status = diff > 0 ? '(Gets)' : diff < 0 ? '(Owes)' : '(Settled)';
        const color = diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-gray-600';
        tbody.innerHTML += `<tr><td class="border p-2">${name}</td><td class="border p-2">${currency}${totals[idx].toFixed(2)}</td><td class="border p-2">${currency}${shares[idx].toFixed(2)}</td><td class="border p-2 ${color}">${currency}${bal} ${status}</td></tr>`;
    });

    calculateOwed(balances, currency);
}

function calculateOwed(balances, currency) {
    let owedList = document.getElementById('owedList');
    owedList.innerHTML = '';

    let debtors = balances.filter(b => b.amount < 0).sort((a, b) => a.amount - b.amount);
    let creditors = balances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);

    debtors.forEach(debtor => {
        let owe = -debtor.amount;
        for (let i = 0; i < creditors.length && owe > 0; i++) {
            if (creditors[i].amount === 0) continue;
            let pay = Math.min(owe, creditors[i].amount);
            owedList.innerHTML += `<li>${debtor.name} owes ${currency}${pay.toFixed(2)} to ${creditors[i].name}</li>`;
            owe -= pay;
            creditors[i].amount -= pay;
        }
    });
}

function downloadCSV() {
    let csv = "=== Purpose Summary ===\nPurpose,Category,Paid By,Who is Involved\n";
    document.querySelectorAll('#purposeFields > div').forEach(p => {
        const purpose = p.querySelector('.purpose').value;
        const category = p.querySelector('.category').value;
        let paidBy = "";
        [...p.querySelectorAll('.amount')].forEach((amt, idx) => {
            const val = parseFloat(amt.value) || 0;
            if (val > 0) {
                paidBy += `${names[idx]}: ${val}, `;
            }
        });
        paidBy = paidBy.slice(0, -2);
        let involved = [...p.querySelectorAll('.involved input')].filter(c => c.checked).map(c => names[c.dataset.idx]).join(", ");
        csv += `${purpose},${category},"${paidBy}","${involved}"\n`;
    });
    csv += "\n=== Final Settlement ===\nName,Paid,Share,Balance\n";
    document.querySelectorAll('#settlementTable tbody tr').forEach(row => {
        csv += [...row.children].map(td => td.textContent).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bill-settlement.csv';
    link.click();
}

function downloadPDF() {
    const opt = {
        margin: 0.5,
        filename: 'Group-Bill-Settlement.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(document.body).set(opt).save();
}

function generateShareLink() {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
}

function showQRCode() {
    const canvas = document.getElementById('qrCodeCanvas');
    const qr = new QRious({
        element: canvas,
        value: window.location.href,
        size: 150
    });
    canvas.classList.remove('hidden');
}

document.addEventListener('click', function (event) {
    if (!event.target.closest('#downloadMenu') &&
        !event.target.closest('#shareMenu') &&
        !event.target.closest('[onclick^="toggleDropdown"]')) {
        document.getElementById('downloadMenu').classList.add('hidden');
        document.getElementById('shareMenu').classList.add('hidden');
    }
});
