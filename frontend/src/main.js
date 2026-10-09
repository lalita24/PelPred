import './style.css';
import './mobile_style.css';

// --- ระบบจัดการ Custom Dropdown ทั้งหมด ---
document.addEventListener("DOMContentLoaded", () => {
    function setupCustomDropdown(selectId, containerId) {
        const customSelect = document.getElementById(containerId);
        if (!customSelect) return;

        const selected = customSelect.querySelector(".select-selected");
        const items = customSelect.querySelector(".select-items");
        const realSelect = document.getElementById(selectId);

        selected.addEventListener("click", function (e) {
            e.stopPropagation();
            document.querySelectorAll('.select-items').forEach(el => {
                if (el !== items) el.classList.add('select-hide');
            });
            items.classList.toggle("select-hide");
        });

        items.querySelectorAll("div").forEach(item => {
            item.addEventListener("click", function () {
                selected.innerHTML = this.innerHTML;
                realSelect.value = this.getAttribute("data-value");
                items.classList.add("select-hide");
            });
        });
    }

    setupCustomDropdown("part-select", "custom-part-select");
    setupCustomDropdown("export-format", "custom-export-select");

    document.addEventListener("click", function () {
        document.querySelectorAll('.select-items').forEach(el => el.classList.add('select-hide'));
    });
});

// --- ฟังก์ชันสลับเมนู ---
window.switchTab = function (tabId, element) {
    window.scrollTo(0, 0);

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.menu-list li').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }

    const homeBanner = document.getElementById('home-banner');
    const bodyElement = document.body;

    if (tabId === 'home') {
        if (homeBanner) homeBanner.classList.add('active-banner');
        bodyElement.classList.add('is-home');
    } else {
        if (homeBanner) homeBanner.classList.remove('active-banner');
        bodyElement.classList.remove('is-home');
    }
};

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('image-upload');
const dropzoneContent = document.getElementById('dropzone-content');
const imagePreview = document.getElementById('image-preview');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFilePreview(fileInput.files[0]);
    }
});
fileInput.addEventListener('change', function () {
    if (this.files.length) handleFilePreview(this.files[0]);
});

function handleFilePreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
        dropzoneContent.style.display = "none";
    };
    reader.readAsDataURL(file);
}

// ส่งภาพวิเคราะห์ 
document.getElementById('submit-btn').addEventListener('click', async () => {
    const partSelect = document.getElementById('part-select').value;
    if (!fileInput.files[0]) {
        alert("กรุณาอัปโหลดรูปภาพก่อนวิเคราะห์");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("part", partSelect);

    const btn = document.getElementById('submit-btn');
    btn.innerText = "กำลังประมวลผล...";
    btn.disabled = true;

    try {
        const response = await fetch("/predict", {
            method: "POST",
            body: formData
        });
        const data = await response.json();

        const summaryContainer = document.getElementById('result-summary-container');
        const reportConclusion = document.getElementById('report-conclusion-container');

        let summaryHTML = `<p class="summary-lead">จากการวิเคราะห์จำแนกเพศ ได้ผลลัพธ์ดังนี้</p><div class="simple-summary-text">`;
        let reportHTML = `
            <div style="text-align: center; color: #333; line-height: 1.6;">
                <p style="font-size: 20px; font-weight: bold; margin: 0 0 15px 0; color: #4d4c4b;">จากการวิเคราะห์จำแนกเพศ ได้ผลลัพธ์ดังนี้</p>
        `;

        if (data.details && data.details.length > 0) {
            data.details.forEach(item => {
                const confValue = typeof item.conf === 'number' ? item.conf.toFixed(2) : item.conf;
                const genderColor = (item.gender_code === "female") ? "#e67e22" : "#e67e22";

                // เนื้อหาหน้าเว็บ
                summaryHTML += `
                    <p><strong>${item.anatomy}</strong> มีลักษณะเป็น <span class="gender-text-inline" style="color: ${genderColor}; font-weight: bold;">${item.gender}</span></p>
                    <p style="margin-bottom: 12px;">ด้วยความเชื่อมั่น <strong>${confValue}%</strong></p>
                `;

                // เนื้อหาหน้า PDF Report
                reportHTML += `
                    <p style="font-size: 18px; margin: 0;">${item.anatomy} มีลักษณะเป็น <span style="color: ${genderColor}; font-weight: bold;">${item.gender}</span></p>
                    <p style="font-size: 18px; margin: 0 0 15px 0;">ด้วยความเชื่อมั่น <strong>${confValue}%</strong></p>
                `;
            });

            summaryHTML += `</div>`;
            reportHTML += `</div>`;

            // ดึงข้อความสรุปภาพรวมจาก Backend
            if (data.is_dual && data.summary_message) {
                document.getElementById('summary-text').innerText = data.summary_message;
                document.getElementById('report-summary-text').innerText = data.summary_message;

                document.getElementById('result-summary-container').classList.remove('summary-box-hidden');
                document.getElementById('report-conclusion-container').classList.remove('summary-report-box-hidden');
                document.getElementById('report-conclusion-container').style.display = 'block';
            } else {
                document.getElementById('result-summary-container').classList.add('summary-box-hidden');
                document.getElementById('report-conclusion-container').classList.add('summary-report-box-hidden');
                document.getElementById('report-conclusion-container').style.display = 'none';
            }

            let existingSummaryDetails = document.getElementById("summary-details");
            if (!existingSummaryDetails) {
                existingSummaryDetails = document.createElement("div");
                existingSummaryDetails.id = "summary-details";

                existingSummaryDetails.className = "result-text-box-bottom";
                existingSummaryDetails.style.marginBottom = "20px";

                summaryContainer.parentNode.insertBefore(existingSummaryDetails, summaryContainer);
            }
            existingSummaryDetails.innerHTML = summaryHTML;

            let existingReportDetails = document.getElementById("report-details");
            if (!existingReportDetails) {
                existingReportDetails = document.createElement("div");
                existingReportDetails.id = "report-details";

                existingReportDetails.className = "result-text-box-bottom";
                existingReportDetails.style.width = "85%";
                existingReportDetails.style.margin = "0 auto";
                existingReportDetails.style.boxSizing = "border-box";

                reportConclusion.parentNode.insertBefore(existingReportDetails, reportConclusion);
            }
            existingReportDetails.innerHTML = reportHTML;

        } else {
            // กรณีตรวจไม่พบ
            let existingSummaryDetails = document.getElementById("summary-details");
            if (existingSummaryDetails) {
                existingSummaryDetails.innerHTML = `<p class="summary-lead" style="color: #c0392b;">ไม่พบบริเวณกระดูกที่เลือกในภาพนี้</p>`;
            } else {
                summaryContainer.insertAdjacentHTML('beforebegin', `<div id="summary-details" class="result-text-box-bottom" style="margin-bottom: 20px;"><p class="summary-lead" style="color: #c0392b;">ไม่พบบริเวณกระดูกที่เลือกในภาพนี้</p></div>`);
            }

            let existingReportDetails = document.getElementById("report-details");
            if (existingReportDetails) {
                existingReportDetails.innerHTML = `
                <div style="text-align: center;">
                    <p style="font-size: 20px; color: #c0392b; margin: 0; font-weight: bold;">ไม่พบบริเวณกระดูกที่ต้องการวิเคราะห์ในภาพนี้</p>
                </div>`;
            } else {
                // 💡 เพิ่ม Class และ Style ให้แสดงกรอบในใบ Report เวลากรณีไม่พบกระดูก
                reportConclusion.insertAdjacentHTML('beforebegin', `
                <div id="report-details" class="result-text-box-bottom" style="width: 85%; margin: 0 auto 20px auto; box-sizing: border-box; text-align: center;">
                    <p style="font-size: 20px; color: #c0392b; margin: 0; font-weight: bold;">ไม่พบบริเวณกระดูกที่ต้องการวิเคราะห์ในภาพนี้</p>
                </div>`);
            }

            document.getElementById('result-summary-container').classList.add('summary-box-hidden');
            document.getElementById('report-conclusion-container').style.display = 'none';
        }

        if (data.heatmap_base64) document.getElementById('heatmap-image').src = data.heatmap_base64;
        if (data.image_base64) {
            document.getElementById('result-image').src = data.image_base64;
            document.getElementById('report-image').src = data.image_base64;
        }

        document.getElementById('result-section').style.display = "block";
        btn.style.display = "none";

    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> วิเคราะห์ผล';
        btn.disabled = false;
    }
});

/* ฟังก์ชันแปลง Base64 เป็น Blob ป้องกันเว็บบนมือถือเปลี่ยนหน้า */
function base64ToBlob(base64, mimeType) {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
}

/* ฟังก์ชัน Export ไฟล์ */
window.exportResult = async function () {
    const container = document.getElementById('export-container');
    const reportElement = document.getElementById('hidden-report-template');
    const exportFormat = document.getElementById('export-format').value;

    // บันทึกตำแหน่งการเลื่อนหน้าจอเดิมเอาไว้
    const currentScrollY = window.scrollY;

    // เลื่อนจอไปบนสุด เพื่อแก้บั๊ก html2canvas แคปหน้าจอว่างเปล่า
    window.scrollTo(0, 0);

    // เปิดคอนเทนเนอร์ให้แสดงผลขึ้นมา
    container.style.display = 'block';
    container.style.position = 'absolute';
    container.style.opacity = '1';
    container.style.zIndex = '9999';
    container.style.left = '0px';
    container.style.top = '0px';

    const hideContainer = () => {
        container.style.opacity = '0';
        container.style.zIndex = '-1000';
        container.style.left = '-9999px';
        // เลื่อนจอกลับมาตำแหน่งเดิมให้ผู้ใช้
        window.scrollTo(0, currentScrollY);
    };

    // รอ 500ms ให้เบราว์เซอร์จัดการหน้าเว็บเสร็จสมบูรณ์
    setTimeout(async () => {
        try {
            const canvasConfig = {
                scale: 2,
                useCORS: true,
                scrollY: 0,
                windowWidth: document.documentElement.offsetWidth,
                backgroundColor: '#ffffff'
            };
            const canvas = await html2canvas(reportElement, canvasConfig);

            if (exportFormat === 'pdf') {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);

                const pdfWrapper = document.createElement('div');
                pdfWrapper.style.width = '794px';
                pdfWrapper.style.height = '1122px';
                pdfWrapper.style.overflow = 'hidden';
                pdfWrapper.innerHTML = `<img src="${imgData}" style="width: 100%; height: 100%; display: block; margin: 0; padding: 0;">`;

                const opt = {
                    margin: 0,
                    filename: 'Pelvic-Predict-Report.pdf',
                    image: { type: 'jpeg', quality: 1.0 },
                    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                // วาดรูปลง PDF
                await html2pdf().set(opt).from(pdfWrapper).save();
                hideContainer();

            } else {
                // ส่วนของ PNG / JPG บนมือถือ 
                const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
                const imgData = canvas.toDataURL(mimeType, 1.0);

                const blob = base64ToBlob(imgData, mimeType);
                const blobUrl = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.download = `Pelvic-Predict-Report.${exportFormat}`;
                link.href = blobUrl;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                hideContainer();
            }
        } catch (error) {
            console.error("Export error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกไฟล์");
            hideContainer();
        }
    }, 500);
};

// --- เคลียร์ค่า ---
window.resetApp = function () {
    document.getElementById('result-section').style.display = "none";
    document.getElementById('submit-btn').style.display = "inline-block";
    fileInput.value = "";
    imagePreview.style.display = "none";
    imagePreview.src = "";
    document.getElementById('result-image').src = "";
    document.getElementById('heatmap-image').src = "";
    document.getElementById('report-image').src = "";
    dropzoneContent.style.display = "block";
};

// --- สคริปต์ควบคุมเมนู 3 ขีดแบบ Smooth (Accordion) ---
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');
const guideDropdown = document.getElementById('guideDropdown');

if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburgerBtn.classList.toggle('open');
        navMenu.classList.toggle('active');
    });

    if (guideDropdown) {
        guideDropdown.querySelector('.dropbtn').addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.stopPropagation();
                guideDropdown.classList.toggle('open');
            }
        });
    }

    navMenu.querySelectorAll('li:not(.dropdown), .dropdown-content a').forEach(item => {
        item.addEventListener('click', () => {
            hamburgerBtn.classList.remove('open');
            navMenu.classList.remove('active');
            if (guideDropdown) guideDropdown.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            hamburgerBtn.classList.remove('open');
            navMenu.classList.remove('active');
            if (guideDropdown) guideDropdown.classList.remove('open');
        }
    });
}

// --- สคริปต์ควบคุม Slider (LINKS) ด้วย Swiper.js ---
document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector('.clients-slider')) {
        new Swiper('.clients-slider', {
            speed: 600,
            loop: true,
            autoplay: {
                delay: 4000,
                disableOnInteraction: false
            },
            slidesPerView: 'auto',
            pagination: {
                el: '.swiper-pagination',
                type: 'bullets',
                clickable: true
            },
            breakpoints: {
                320: {
                    slidesPerView: 2,
                    spaceBetween: 10
                },
                480: {
                    slidesPerView: 3,
                    spaceBetween: 20
                },
                640: {
                    slidesPerView: 4,
                    spaceBetween: 30
                },
                992: {
                    slidesPerView: 5,
                    spaceBetween: 40
                }
            }
        });
    }
});