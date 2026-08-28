import './style.css';

// --- ฟังก์ชันสลับเมนู ---
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.menu-list li').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// --- ตัวแปรสำหรับจัดการ Drag & Drop ---
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('image-upload');
const dropzoneContent = document.getElementById('dropzone-content');
const imagePreview = document.getElementById('image-preview');

// --- จัดการเหตุการณ์ลากวางไฟล์และคลิก ---
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFilePreview(fileInput.files[0]);
    }
});

fileInput.addEventListener('change', function() {
    if (this.files.length) {
        handleFilePreview(this.files[0]);
    }
});

// ฟังก์ชันสร้างรูปพรีวิว
function handleFilePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
        dropzoneContent.style.display = "none";
    }
    reader.readAsDataURL(file);
}

// --- ฟังก์ชันส่งภาพไปให้ Python Backend (FastAPI) ---
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
        // ยิง API ไปที่ FastAPI (รันอยู่ที่ port 8000)
        const response = await fetch("http://localhost:8000/predict", {
            method: "POST",
            body: formData
        });
        
        const data = await response.json();
        
        // แสดงผลลัพธ์เพศและความมั่นใจ
        document.getElementById('result-gender').innerText = data.gender;
        document.getElementById('result-conf').innerText = data.confidence;
        
        // เปลี่ยนรูปพรีวิวให้กลายเป็นรูปที่ถูกตีกรอบจากโมเดล YOLO
        if (data.image_base64) {
            document.getElementById('image-preview').src = data.image_base64;
        }

        document.getElementById('result-section').style.display = "block";
        btn.style.display = "none"; // ซ่อนปุ่มเดิม
        
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
        btn.innerText = "🔍 วิเคราะห์ผล";
        btn.disabled = false;
    }
});

// --- ฟังก์ชันล้างค่าเพื่อเริ่มใหม่ ---
window.resetApp = function() {
    // ซ่อนผลลัพธ์และคืนค่าปุ่มกด
    document.getElementById('result-section').style.display = "none";
    document.getElementById('submit-btn').style.display = "inline-block";
    
    // เคลียร์ไฟล์และรูปพรีวิว
    fileInput.value = "";
    imagePreview.style.display = "none";
    imagePreview.src = "";
    dropzoneContent.style.display = "block";
}