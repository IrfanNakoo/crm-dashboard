// ======================================
// CRM Dashboard - Branch Summary
// Version 1.0
// ======================================

console.log("CRM Dashboard Loaded");

// Replace with your Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbwGfzdpNKZtOpNEdq6RrAYidw9zX2yTvDrasrUvlscoyLEz67hdni466e7YBKve1m02Kg/exec";

document.addEventListener("DOMContentLoaded", () => {
    loadBranchSummary();
});

async function loadBranchSummary() {

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to connect to API");
        }

        const data = await response.json();

        renderTable(data);

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}

function renderTable(data) {

    const tbody = document.getElementById("branch-rows");

    tbody.innerHTML = "";

    let totalProspect = 0;
    let totalBooking = 0;
    let totalSubmission = 0;
    let totalRfa = 0;
    let totalRegistration = 0;

    data.forEach(branch => {

        totalProspect += Number(branch.prospect);
        totalBooking += Number(branch.booking);
        totalSubmission += Number(branch.submission);
        totalRfa += Number(branch.rfa);
        totalRegistration += Number(branch.registration);

        tbody.innerHTML += `
            <tr>
                <td>${branch.branch}</td>
                <td>${branch.prospect}</td>
                <td>${branch.booking}</td>
                <td>${branch.submission}</td>
                <td>${branch.rfa}</td>
                <td>${branch.registration}</td>
                <td>${(Number(branch.conversion) * 100).toFixed(1)}%</td>
            </tr>
        `;

    });

    const totalBody = document.getElementById("branch-total-row");

    totalBody.innerHTML = `
        <tr class="row row--total">
            <td><strong>TOTAL</strong></td>
            <td><strong>${totalProspect}</strong></td>
            <td><strong>${totalBooking}</strong></td>
            <td><strong>${totalSubmission}</strong></td>
            <td><strong>${totalRfa}</strong></td>
            <td><strong>${totalRegistration}</strong></td>
            <td><strong>${((totalRegistration / totalProspect) * 100).toFixed(1)}%</strong></td>
        </tr>
    `;

}