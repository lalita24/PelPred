from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import random
import time

app = FastAPI()

# อนุญาตให้ Frontend (Vite) เชื่อมต่อเข้ามาได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# โหลดโมเดล (ปรับเปลี่ยนตามโค้ดจริงของคุณ)
def load_model():
    return "My_Trained_Model"

model = load_model()

@app.post("/predict")
async def predict_gender(file: UploadFile = File(...), part: str = Form(...)):
    # จำลองเวลาประมวลผล
    time.sleep(2) 
    
    # ---------------------------------------------------------
    # โค้ดจำลองผลลัพธ์ (แทนที่ด้วย process_and_predict ของจริง)
    # ---------------------------------------------------------
    real_gender = "เพศชาย" if random.random() > 0.5 else "เพศหญิง"
    real_confidence = random.uniform(85.0, 99.9)
    
    return {
        "gender": real_gender,
        "confidence": round(real_confidence, 2),
        "part": part,
        "message": "Success"
    }

# วิธีรัน: uvicorn main:app --reload