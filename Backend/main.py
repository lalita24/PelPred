import io
import base64
import cv2
import numpy as np
import torch
import matplotlib
matplotlib.use('Agg')  
import matplotlib.pyplot as plt
import uvicorn

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "cuda:0" if torch.cuda.is_available() else "cpu"
model = YOLO(r"D:\poiter4u\DemoProject\Model\train\weights\best.pt")
model.to(device)

def parse_gender_and_anatomy(label_raw: str):
    l = label_raw.lower().strip()
    
    is_female = ("female" in l) or l.startswith("f_") or l.startswith("f-") or (" f " in f" {l} ") or ("_f" in l)
    is_male = ("male" in l) or l.startswith("m_") or l.startswith("m-") or (" m " in f" {l} ") or ("_m" in l)
    
    if is_female:
        gender = "เพศหญิง"
        gender_code = "female"
    elif is_male:
        gender = "เพศชาย"
        gender_code = "male"
    else:
        gender = label_raw
        gender_code = "unknown"

    is_sciatic = "sciatic" in l or "gr" in l
    is_obturator = "obturator" in l or "ob" in l
    
    if is_sciatic:
        anatomy = "Greater Sciatic Notch"
    elif is_obturator:
        anatomy = "Obturator Foramen"
    else:
        anatomy = label_raw

    return gender, gender_code, anatomy, is_sciatic, is_obturator


@app.post("/predict")
async def predict_gender(file: UploadFile = File(...), part: str = Form(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    processed_img = img.copy()
    original_h, original_w = img.shape[:2]

    results = model.predict(source=img, conf=0.25, device=device, verbose=False)
    r = results[0]
    filtered_predictions = []

    if len(r.boxes) > 0:
        for box in r.boxes:
            cls_id = int(box.cls[0].detach().cpu())
            conf = float(box.conf[0].detach().cpu()) * 100
            label_raw = r.names[cls_id] 
            
            gender, gender_code, anatomy, is_sciatic, is_obturator = parse_gender_and_anatomy(label_raw)
            
            keep_box = False
            if part == "Greater Sciatic Notch" and is_sciatic:
                keep_box = True
            elif part == "Obturator Foramen" and is_obturator:
                keep_box = True
            elif part == "Greater Sciatic Notch & Obturator Foramen":
                if is_sciatic or is_obturator:
                    keep_box = True 
                
            if keep_box:
                x1, y1, x2, y2 = map(int, box.xyxy[0].detach().cpu().numpy())
                filtered_predictions.append({
                    "label_raw": label_raw,
                    "conf": conf, 
                    "box": (x1, y1, x2, y2),
                    "gender": gender,
                    "gender_code": gender_code,
                    "anatomy": anatomy,
                    "is_sciatic": is_sciatic,
                    "is_obturator": is_obturator
                })

    if filtered_predictions:
        for p in filtered_predictions:
            x1, y1, x2, y2 = p["box"]
            display_text = f"{p['anatomy']} ({p['conf']:.2f}%)"
            
            if p["gender_code"] == "female":
                box_color = (138, 74, 246)
                text_color = (0, 0, 0)
            elif p["gender_code"] == "male":
                box_color = (255, 191, 0)
                text_color = (0, 0, 0)
            else:
                box_color = (0, 255, 0)
                text_color = (0, 0, 0)

            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 2.5
            thickness = 4
            
            text_size = cv2.getTextSize(display_text, font, font_scale, thickness)[0]
            text_x = x1
            text_y = max(40, y1 - 10)
            
            cv2.rectangle(processed_img, (x1, y1), (x2, y2), box_color, 3)
            cv2.rectangle(processed_img, (text_x, text_y - text_size[1] - 5), (text_x + text_size[0], text_y + 5), box_color, -1)
            cv2.putText(processed_img, display_text, (text_x, text_y), font, font_scale, text_color, thickness)

    is_dual = (part == "Greater Sciatic Notch & Obturator Foramen")
    
    _, buffer = cv2.imencode('.jpg', processed_img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    heatmap_base64 = None
    try:
        layers = model.model.model
        feature_layer = None
        for i in range(len(layers) - 2, -1, -1):
            layer = layers[i]
            if any(isinstance(sub, torch.nn.Conv2d) for sub in layer.modules()):
                feature_layer = layer
                break

        if feature_layer is not None:
            activation = None
            def hook_fn(module, input, output):
                nonlocal activation
                if torch.is_tensor(output):
                    activation = output.detach()
                elif isinstance(output, (tuple, list)):
                    for item in output:
                        if torch.is_tensor(item) and item.ndim == 4:
                            activation = item.detach()
                            break

            hook = feature_layer.register_forward_hook(hook_fn)

            image_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            input_image = cv2.resize(image_rgb, (640, 640))
            input_tensor = torch.from_numpy(input_image).permute(2, 0, 1).float() / 255.0
            input_tensor = input_tensor.unsqueeze(0).to(device)

            with torch.no_grad():
                _ = model.model(input_tensor)
            hook.remove()

            if activation is not None:
                cam = torch.relu(activation[0].mean(dim=0)).cpu().numpy()
                cam_min, cam_max = cam.min(), cam.max()
                if (cam_max - cam_min) > 1e-8:
                    cam = (cam - cam_min) / (cam_max - cam_min)
                else:
                    cam = np.zeros_like(cam)

                cam_percent = cv2.resize(cam * 100, (original_w, original_h), interpolation=cv2.INTER_LINEAR)
                heatmap_uint8 = np.uint8(cam_percent * 2.55)
                heatmap_bgr = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
                heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

                overlay = cv2.addWeighted(image_rgb, 0.55, heatmap_rgb, 0.45, 0)

                for p in filtered_predictions:
                    bx1, by1, bx2, by2 = p["box"]
                    cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (255, 255, 255), 3)
                    txt = f"{p['anatomy']} {p['conf']:.2f}%"
                    cv2.putText(overlay, txt, (bx1, max(by1 - 10, 30)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)

                fig, ax = plt.subplots(figsize=(6.5, 6), dpi=150)
                im_ax = ax.imshow(overlay)
                ax.axis('off')

                norm = matplotlib.colors.Normalize(vmin=0, vmax=100)
                sm = plt.cm.ScalarMappable(cmap='jet', norm=norm)
                sm.set_array([])
                cbar = fig.colorbar(sm, ax=ax, fraction=0.046, pad=0.04)
                cbar.set_label('Activation (%)', fontsize=11, fontweight='bold', labelpad=8)
                cbar.ax.tick_params(labelsize=9)

                plt.tight_layout()

                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0.05)
                plt.close(fig)
                buf.seek(0)
                heatmap_base64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"Heatmap generation error: {e}")

    return {
        "is_dual": is_dual,
        "details": filtered_predictions,
        "image_base64": f"data:image/jpeg;base64,{img_base64}",
        "heatmap_base64": heatmap_base64
    }
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)