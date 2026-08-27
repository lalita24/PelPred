import './style.css';

// ฟังก์ชันสลับเมนู
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.menu-list li').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// ฟังก์ชันส่งภาพไปให้ Python Backend
document.getElementById('submit-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('image-upload');
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
        
        // แสดงผลลัพธ์
        document.getElementById('result-gender').innerText = data.gender;
        document.getElementById('result-conf').innerText = data.confidence;
        document.getElementById('result-section').style.display = "block";
        btn.style.display = "none"; // ซ่อนปุ่มเดิม
        
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
        btn.innerText = "🔍 วิเคราะห์";
        btn.disabled = false;
    }
});

window.resetApp = function() {
    document.getElementById('result-section').style.display = "none";
    document.getElementById('submit-btn').style.display = "block";
    document.getElementById('image-upload').value = "";
}