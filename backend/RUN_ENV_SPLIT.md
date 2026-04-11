# Environment Split Commands

Use two terminals to avoid dependency conflicts.

## 1) Backend API terminal (`final_env`)

```powershell
conda activate final_env
cd D:\2nd_year\2nd_sem\Hackathon\Pragyantra\Pragyantra\backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Optional environment flags for auto-render behavior:

```powershell
$env:AUTO_RENDER_MANIM = "true"
$env:MANIM_ENV_NAME = "manim_env"
$env:MANIM_SCENE_NAME = "ConceptEvolutionScene"
$env:MANIM_RENDER_TIMEOUT_SECONDS = "150"
```

When `AUTO_RENDER_MANIM=true`, the backend auto-renders a Manim video during `/api/analyze-response` and returns a direct `video_url` in the simulation payload shown below AI feedback.

## 2) Manim rendering terminal (`manim_env`)

```powershell
conda activate manim_env
cd D:\2nd_year\2nd_sem\Hackathon\Pragyantra\Pragyantra\backend
pip install -r requirements-manim.txt
cd manim_scripts
manim <script_file.py> <SceneName>
```

## Generate a script from backend API

Call:

`POST /api/simulations/manim-script`

Example payload:

```json
{
  "current_context": "Plot the effect of a quadratic equation",
  "predicted_topic": "Quadratic behavior",
  "misconception_verdict": "Student confuses vertex and x-intercepts",
  "scene_name": "QuadraticExplorer"
}
```

Response includes:

- `file_path` under `backend/manim_scripts`
- `command` to run inside `manim_scripts` folder
- `script` content
