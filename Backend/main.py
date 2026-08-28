from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# โหลดโมเดลรวม 2 ตำแหน่งไว้ในหน่วยความจำ
model = YOLO(r"D:\poiter4u\DemoProject\Model\train\weights\best.pt")

@app.post("/predict")
async def predict_gender(file: UploadFile = File(...), part: str = Form(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    processed_img = img.copy()

    # 1. นำภาพเข้าโมเดลเพื่อหาตำแหน่งทั้งหมด
    results = model.predict(source=img, conf=0.25)
    r = results[0]
    
    filtered_predictions = []

    # 2. กรองผลลัพธ์ตามตำแหน่งที่ผู้ใช้เลือก
    if len(r.boxes) > 0:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0]) * 100
            label = r.names[cls_id] 
            
            label_lower = label.lower()
            is_sciatic = "sciatic" in label_lower
            is_obturator = "obturator" in label_lower
            
            keep_box = False
            
            if part == "Greater Sciatic Notch" and is_sciatic:
                keep_box = True
            elif part == "Obturator Foramen" and is_obturator:
                keep_box = True
            elif part == "Greater Sciatic Notch & Obturator Foramen":
                if is_sciatic or is_obturator:
                    keep_box = True 
                
            # เก็บบันทึกเฉพาะกรอบที่ผ่านเงื่อนไข
            if keep_box:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                filtered_predictions.append({
                    "label": label, 
                    "conf": conf, 
                    "box": (x1, y1, x2, y2)
                })

    # 3. วาดกรอบ ใส่ข้อความ และสรุปผล
    final_gender = "ไม่พบกระดูกที่ต้องการ"
    final_conf = 0.0

    if filtered_predictions:
        for p in filtered_predictions:
            x1, y1, x2, y2 = p["box"]
            
            # ตรวจสอบและจัดรูปแบบข้อความที่จะแสดงบนรูปภาพ
            label_lower = p['label'].lower()
            if "obturator" in label_lower:
                display_text = f"Obturator Foramen ({p['conf']:.1f}%)"
            elif "sciatic" in label_lower:
                display_text = f"Greater Sciatic Notch ({p['conf']:.1f}%)"
            else:
                display_text = f"{p['label']} ({p['conf']:.1f}%)"
            
            # กำหนดสีกรอบตามเพศ (OpenCV ใช้ระบบสี BGR)
            if "female" in label_lower:
                box_color = (138, 74, 246)  # สีชมพู (Pink)
                text_color = (0, 0, 0)       # ตัวหนังสือสีดำ
            elif "male" in label_lower:
                box_color = (255, 191, 0)    # สีฟ้า (Deep Sky Blue)
                text_color = (0, 0, 0)       # ตัวหนังสือสีดำ
            else:
                box_color = (0, 255, 0)      # สีเขียว (ค่าเริ่มต้น)
                text_color = (0, 0, 0)

            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 2.5
            thickness = 4
            
            # คำนวณขนาดข้อความเพื่อสร้างพื้นหลัง
            text_size = cv2.getTextSize(display_text, font, font_scale, thickness)[0]
            text_x = x1
            text_y = max(40, y1 - 10)
            
            # วาดกรอบสี่เหลี่ยมรอบวัตถุด้วยสีที่กำหนด
            cv2.rectangle(processed_img, (x1, y1), (x2, y2), box_color, 3)
            # วาดพื้นหลังข้อความ
            cv2.rectangle(processed_img, (text_x, text_y - text_size[1] - 5), (text_x + text_size[0], text_y + 5), box_color, -1)
            # พิมพ์ข้อความทับลงไป
            cv2.putText(processed_img, display_text, (text_x, text_y), font, font_scale, text_color, thickness)
        
        # ดึงเฉพาะคำว่า Male / Female และแปลงเป็นภาษาไทย
        raw_labels = list(set([p['label'].split(' ')[0] for p in filtered_predictions]))
        thai_genders = []
        for lbl in raw_labels:
            if lbl.lower() == "male":
                thai_genders.append("เพศชาย")
            elif lbl.lower() == "female":
                thai_genders.append("เพศหญิง")
            else:
                thai_genders.append(lbl)
                
        final_gender = " / ".join(thai_genders)
        
        # หาค่าเฉลี่ยความมั่นใจ
        final_conf = sum([p['conf'] for p in filtered_predictions]) / len(filtered_predictions)

    # 4. แปลงภาพที่ตีกรอบแล้วกลับเป็น Base64
    _, buffer = cv2.imencode('.jpg', processed_img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "gender": final_gender,
        "confidence": round(final_conf, 2),
        "image_base64": f"data:image/jpeg;base64,{img_base64}"
    }
# วิธีรัน: uvicorn main:app --reload