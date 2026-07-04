console.log("APP START");

const API_URL = "https://script.google.com/macros/s/AKfycbyiEBPEkGfp_-pk4YaeA6eAfj4Nnk7fnL-Xwzr3sXTSoHt44w6tlN4PALlysF8QtMiO/exec";

fetch(API_URL)
.then(res => res.json())
.then(data => {

    let totalProspects = 0;
    let totalBookings = 0;
    let totalSubmissions = 0;
    let totalRfa = 0;
    let totalRegistration = 0;

    data.forEach(sa => {

        const row = document.querySelector(`[data-sa-id="${sa.said}"]`);

        if (row) {
            row.querySelector(".cell-prospects").textContent = sa.prospects;
            row.querySelector(".cell-bookings").textContent = sa.bookings;
            row.querySelector(".cell-submissions").textContent = sa.submissions;
            row.querySelector(".cell-rfa").textContent = sa.rfa;
            row.querySelector(".cell-registration").textContent = sa.registration;
        }

        totalProspects += Number(sa.prospects) || 0;
        totalBookings += Number(sa.bookings) || 0;
        totalSubmissions += Number(sa.submissions) || 0;
        totalRfa += Number(sa.rfa) || 0;
        totalRegistration += Number(sa.registration) || 0;

    });

    const totalRow = document.querySelector('[data-sa-id="ALL"]');

    if (totalRow) {
        totalRow.querySelector(".cell-prospects").textContent = totalProspects;
        totalRow.querySelector(".cell-bookings").textContent = totalBookings;
        totalRow.querySelector(".cell-submissions").textContent = totalSubmissions;
        totalRow.querySelector(".cell-rfa").textContent = totalRfa;
        totalRow.querySelector(".cell-registration").textContent = totalRegistration;
    }

})
.catch(error => {
    console.error(error);
});