import './style.css';

// --- ระบบจัดการ Custom Dropdown ---
document.addEventListener("DOMContentLoaded", () => {
    const customSelect = document.getElementById("custom-part-select");
    if (!customSelect) return;
    
    const selected = customSelect.querySelector(".select-selected");
    const items = customSelect.querySelector(".select-items");
    const realSelect = document.getElementById("part-select");

    // เปิด/ปิด Dropdown เมื่อคลิก
    selected.addEventListener("click", function() {
        items.classList.toggle("select-hide");
    });

    // อัปเดตค่าเมื่อคลิกเลือกตัวเลือก
    items.querySelectorAll("div").forEach(item => {
        item.addEventListener("click", function() {
            selected.innerHTML = this.innerHTML; // เปลี่ยนข้อความที่แสดง
            realSelect.value = this.getAttribute("data-value"); // ส่งค่าให้ Select ที่ซ่อนอยู่
            items.classList.add("select-hide"); // ปิด Dropdown
        });
    });

    // ปิด Dropdown เมื่อคลิกที่อื่นบนหน้าเว็บ
    document.addEventListener("click", function(e) {
        if (!customSelect.contains(e.target)) {
            items.classList.add("select-hide");
        }
    });
});

// --- ฟังก์ชันสลับเมนู ---
window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.menu-list li').forEach(el => el.classList.remove('active'));
    if(element) {
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
fileInput.addEventListener('change', function() {
    if (this.files.length) handleFilePreview(this.files[0]);
});

function handleFilePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
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

// --- ฟังก์ชัน Export ไฟล์ (ดึงจากเทมเพลตที่ซ่อนอยู่) ---
window.exportResult = function() {
    const reportElement = document.getElementById('hidden-report-template');
    const exportFormat = document.getElementById('export-format').value;

    // เลื่อนหน้าจอขึ้นบนสุดก่อน Export เพื่อป้องกัน html2canvas ตัดภาพแหว่ง
    window.scrollTo(0, 0);

    // หน่วงเวลาเล็กน้อยเพื่อให้เบราว์เซอร์เตรียม DOM ให้พร้อม
    setTimeout(() => {
        if (exportFormat === 'pdf') {
            const opt = {
                margin:       0,
                filename:     'Pelvic-Predict-Report.pdf',
                image:        { type: 'jpeg', quality: 1.0 },
                html2canvas:  { scale: 2, useCORS: true },
                // ล็อกขนาดพิกเซลให้ตรงกับ CSS เพื่อความแม่นยำ
                jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait' } 
            };
            html2pdf().set(opt).from(reportElement).save();
        } else {
            // Export เป็นไฟล์ภาพ PNG
            html2canvas(reportElement, { scale: 2, useCORS: true }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'Pelvic-Predict-Report.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    }, 100); // ดีเลย์ 100ms
}

// --- เคลียร์ค่า ---
window.resetApp = function() {
    document.getElementById('result-section').style.display = "none";
    document.getElementById('submit-btn').style.display = "inline-block";
    fileInput.value = "";
    imagePreview.style.display = "none";
    imagePreview.src = "";
    document.getElementById('result-image').src = "";
    document.getElementById('report-image').src = "";
    dropzoneContent.style.display = "block";
}