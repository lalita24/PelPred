import './style.css';

// --- ระบบจัดการ Custom Dropdown ทั้งหมด (ขั้นตอนที่ 1 และ ปุ่มดาวน์โหลด) ---
document.addEventListener("DOMContentLoaded", () => {
    // ฟังก์ชันจัดการ Generic Dropdown
    function setupCustomDropdown(selectId, containerId) {
        const customSelect = document.getElementById(containerId);
        if (!customSelect) return;
        
        const selected = customSelect.querySelector(".select-selected");
        const items = customSelect.querySelector(".select-items");
        const realSelect = document.getElementById(selectId);

        selected.addEventListener("click", function(e) {
            e.stopPropagation();
            // ปิด dropdown อื่นๆ ก่อน
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

    // เรียกใช้งานฟังก์ชันสำหรับทั้ง 2 จุด
    setupCustomDropdown("part-select", "custom-part-select");
    setupCustomDropdown("export-format", "custom-export-select");

    // ปิด dropdown ทั้งหมดเมื่อคลิกพื้นที่อื่นบนหน้าเว็บ
    document.addEventListener("click", function() {
        document.querySelectorAll('.select-items').forEach(el => el.classList.add('select-hide'));
    });
});

// --- ฟังก์ชันสลับเมนู ---
window.switchTab = function (tabId, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.menu-list li').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
}

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
    }
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

        // 1. นำข้อมูลใส่ UI หน้าเว็บ
        document.getElementById('result-gender').innerText = data.gender;
        document.getElementById('result-conf').innerText = data.confidence;
        if (data.image_base64) {
            document.getElementById('result-image').src = data.image_base64;
            // 2. นำข้อมูลและรูปภาพใส่แบบฟอร์ม A4 ที่ซ่อนอยู่ด้วย
            document.getElementById('report-image').src = data.image_base64;
        }

        document.getElementById('report-gender').innerText = data.gender;
        document.getElementById('report-conf').innerText = data.confidence;

        document.getElementById('result-section').style.display = "block";
        btn.style.display = "none";

    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
        btn.innerText = "🔍 วิเคราะห์ผล";
        btn.disabled = false;
    }
});

// --- ฟังก์ชัน Export ไฟล์ (PDF / PNG / JPG) ---
window.exportResult = function () {
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
                const opt = {
                    margin: 0,
                    filename: 'Pelvic-Predict-Report.pdf',
                    image: { type: 'jpeg', quality: 1.0 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
                };
                await html2pdf().set(opt).from(reportElement).save();
            } else {
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true, scrollY: 0 });
                const link = document.createElement('a');
                const isJpg = exportFormat === 'jpg';
                link.download = `Pelvic-Predict-Report.${isJpg ? 'jpg' : 'png'}`;
                link.href = canvas.toDataURL(`image/${isJpg ? 'jpeg' : 'png'}`, 1.0);
                link.click();
            }
        } catch (error) {
            console.error("Export error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกไฟล์");
        } finally {
            hideContainer();
        }
    }, 100);
}

// --- เคลียร์ค่า ---
window.resetApp = function () {
    document.getElementById('result-section').style.display = "none";
    document.getElementById('submit-btn').style.display = "inline-block";
    fileInput.value = "";
    imagePreview.style.display = "none";
    imagePreview.src = "";
    document.getElementById('result-image').src = "";
    document.getElementById('report-image').src = "";
    dropzoneContent.style.display = "block";
}