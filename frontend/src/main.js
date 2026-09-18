import './style.css';

// --- ระบบจัดการ Custom Dropdown ทั้งหมด ---
document.addEventListener("DOMContentLoaded", () => {
    function setupCustomDropdown(selectId, containerId) {
        const customSelect = document.getElementById(containerId);
        if (!customSelect) return;
        
        const selected = customSelect.querySelector(".select-selected");
        const items = customSelect.querySelector(".select-items");
        const realSelect = document.getElementById(selectId);

        selected.addEventListener("click", function(e) {
            e.stopPropagation();
            document.querySelectorAll('.select-items').forEach(el => {
                if (el !== items) el.classList.add('select-hide');
            });
            items.classList.toggle("select-hide");
        });

        items.querySelectorAll("div").forEach(item => {
            item.addEventListener("click", function() {
                selected.innerHTML = this.innerHTML;
                realSelect.value = this.getAttribute("data-value");
                items.classList.add("select-hide");
            });
        });
    }

    setupCustomDropdown("part-select", "custom-part-select");
    setupCustomDropdown("export-format", "custom-export-select");

    document.addEventListener("click", function() {
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

// --- ส่งภาพวิเคราะห์ ---
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
        const response = await fetch("http://localhost:8000/predict", {
            method: "POST",
            body: formData
        });
        const data = await response.json();

        const summaryContainer = document.getElementById('result-summary-container');
        const reportConclusion = document.getElementById('report-conclusion-container');
        
        // 1. จัดเตรียมข้อความ Web UI และ PDF 
        if (data.is_dual && data.details && data.details.length > 0) {
            // ดึงค่าแยกแต่ละส่วน
            const sciatic = data.details.find(i => i.is_sciatic) || { anatomy: "Greater Sciatic Notch", gender: "-", conf: "-" };
            const obturator = data.details.find(i => i.is_obturator) || { anatomy: "Obturator Foramen", gender: "-", conf: "-" };
            const sciConf = typeof sciatic.conf === 'number' ? sciatic.conf.toFixed(2) : sciatic.conf;
            const obConf = typeof obturator.conf === 'number' ? obturator.conf.toFixed(2) : obturator.conf;

            // รูปแบบ Web UI
            summaryContainer.innerHTML = `
                <p class="summary-lead">จากการวิเคราะห์จำแนกเพศ ได้ผลลัพธ์ดังนี้</p>
                <div class="simple-summary-text">
                    <p><strong>Greater Sciatic Notch</strong> มีลักษณะเป็น <span class="gender-text-inline">${sciatic.gender}</span> ด้วยความเชื่อมั่น <strong>${sciConf}%</strong></p>
                    <p><strong>Obturator Foramen</strong> มีลักษณะเป็น <span class="gender-text-inline">${obturator.gender}</span> ด้วยความเชื่อมั่น <strong>${obConf}%</strong></p>
                </div>
            `;

            // รูปแบบเอกสาร PDF
            reportConclusion.innerHTML = `
                <div style="text-align: center; color: #333; line-height: 1.6;">
                    <p style="font-size: 20px; font-weight: bold; margin: 0 0 15px 0; color: #4d4c4b;">จากการวิเคราะห์จำแนกเพศ ได้ผลลัพธ์ดังนี้</p>
                    <p style="font-size: 18px; margin: 0;">Greater Sciatic Notch มีลักษณะเป็น <span style="color: #e67e22; font-weight: bold;">${sciatic.gender}</span></p>
                    <p style="font-size: 18px; margin: 0 0 15px 0;">ด้วยความเชื่อมั่น <strong>${sciConf}%</strong></p>
                    <p style="font-size: 18px; margin: 0;">Obturator Foramen มีลักษณะเป็น <span style="color: #e67e22; font-weight: bold;">${obturator.gender}</span></p>
                    <p style="font-size: 18px; margin: 0;">ด้วยความเชื่อมั่น <strong>${obConf}%</strong></p>
                </div>
            `;

        } else if (data.details && data.details.length > 0) {
            const item = data.details[0];
            const partName = item.anatomy;
            const confValue = typeof item.conf === 'number' ? item.conf.toFixed(2) : item.conf;
            
            // รูปแบบ Web UI 
            summaryContainer.innerHTML = `
                <p class="summary-lead">จากการวิเคราะห์จำแนกเพศ ได้ผลลัพธ์ดังนี้</p>
                <div class="simple-summary-text">
                    <p><strong>${partName}</strong> มีลักษณะเป็น <span class="gender-text-inline">${item.gender}</span></p>
                    <p>ด้วยความเชื่อมั่น <strong>${confValue}%</strong></p>
                </div>
            `;

            // รูปแบบเอกสาร PDF 
            reportConclusion.innerHTML = `
                <div style="text-align: center; color: #333; line-height: 1.6;">
                    <p style="font-size: 20px; font-weight: bold; margin: 0 0 15px 0; color: #4d4c4b;">จากการวิเคราะห์จำแนกเพศ ได้ผลลัพธ์ดังนี้</p>
                    <p style="font-size: 18px; margin: 0;">${partName} มีลักษณะเป็น <span style="color: #e67e22; font-weight: bold;">${item.gender}</span></p>
                    <p style="font-size: 18px; margin: 0;">ด้วยความเชื่อมั่น <strong>${confValue}%</strong></p>
                </div>
            `;
        } else {
            summaryContainer.innerHTML = `<p class="summary-lead" style="color: #c0392b;">ไม่พบบริเวณกระดูกที่เลือกในภาพนี้</p>`;
            reportConclusion.innerHTML = `
                <div style="text-align: center;">
                    <p style="font-size: 20px; color: #c0392b;">ไม่พบบริเวณกระดูกที่ต้องการวิเคราะห์ในภาพนี้</p>
                </div>
            `;
        }

        // 2. แสดงรูปภาพต่างๆ
        if (data.heatmap_base64) document.getElementById('heatmap-image').src = data.heatmap_base64;
        if (data.image_base64) {
            document.getElementById('result-image').src = data.image_base64;
            document.getElementById('report-image').src = data.image_base64;
        }

        document.getElementById('result-section').style.display = "block";
        btn.style.display = "none";

    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> วิเคราะห์ผล';
        btn.disabled = false;
    }
});

// --- ฟังก์ชัน Export ไฟล์ ---
window.exportResult = async function () {
    const container = document.getElementById('export-container');
    const reportElement = document.getElementById('hidden-report-template');
    const exportFormat = document.getElementById('export-format').value;

    container.style.opacity = '1';
    container.style.zIndex = '9999';
    container.style.left = '0px';
    container.style.top = '0px';
    window.scrollTo(0, 0);

    const hideContainer = () => {
        container.style.opacity = '0';
        container.style.zIndex = '-1000';
        container.style.left = '-9999px';
    };

    setTimeout(async () => {
        try {
            if (exportFormat === 'pdf') {
                // ปรับความคมชัดระดับ HD
                const opt = {
                    margin: 0,
                    filename: 'Pelvic-Predict-Report.pdf',
                    image: { type: 'jpeg', quality: 1.0 },
                    html2canvas: { scale: 4, useCORS: true, scrollY: 0, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                // ใช้ html2pdf ส่งออก เป็น PDF
                await html2pdf()
                    .set(opt)
                    .from(reportElement)
                    .toPdf()
                    .get('pdf')
                    .then((pdf) => {
                        const totalPages = pdf.internal.getNumberOfPages();
                        for (let i = totalPages; i > 1; i--) {
                            pdf.deletePage(i);
                        }
                    })
                    .save();

            } else {
                const canvas = await html2canvas(reportElement, { scale: 3, useCORS: true, scrollY: 0, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL(`image/${exportFormat === 'jpg' ? 'jpeg' : 'png'}`, 1.0);
                
                const link = document.createElement('a');
                const isJpg = exportFormat === 'jpg';
                link.download = `Pelvic-Predict-Report.${isJpg ? 'jpg' : 'png'}`;
                link.href = imgData;
                link.click();
            }
        } catch (error) {
            console.error("Export error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกไฟล์");
        } finally {
            hideContainer();
        }
    }, 150);
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