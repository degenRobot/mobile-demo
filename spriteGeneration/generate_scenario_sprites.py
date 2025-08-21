import os
import base64
import requests
import json
import time
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')

SCENARIO_API_KEY = os.getenv("SCENARIO_API_KEY")
SCENARIO_API_SECRET = os.getenv("SCENARIO_API_SECRET")

if not SCENARIO_API_KEY or not SCENARIO_API_SECRET:
    print("Error: SCENARIO_API_KEY or SCENARIO_API_SECRET not found in .env file.")
    exit()

credentials = f"{SCENARIO_API_KEY}:{SCENARIO_API_SECRET}"
encoded_credentials = base64.b64encode(credentials.encode()).decode()

headers = {
    "Authorization": f"Basic {encoded_credentials}",
    "Content-Type": "application/json"
}

def poll_job_status(job_id: str) -> dict:
    """Polls the status of a Scenario.gg job until completion."""
    while True:
        status_response = requests.get(
            f"https://api.cloud.scenario.com/v1/jobs/{job_id}",
            headers=headers
        )
        status_response.raise_for_status()
        job_data = status_response.json()
        status = job_data.get("status")

        if status == "success":
            print("Job completed successfully.")
            return job_data
        elif status == "failure":
            print("Job failed:", job_data.get("error"))
            raise Exception("Scenario.gg job failed.")
        else:
            print(f"Job status: {status}, progress: {job_data.get('progress', 0)}%")
            time.sleep(5) # Poll every 5 seconds

def generate_img2img_sprite_sheet(
    prompt: str,
    image_asset_id: str,
    model_id: str,
    output_filename: str,
    strength: float = 0.75,
    num_samples: int = 1,
    guidance: float = 3.5,
    num_inference_steps: int = 28
):
    """Generates a new sprite sheet using img2img and saves it."""
    print(f"Generating sprite sheet for: {prompt}")
    payload = {
        "prompt": prompt,
        "imageId": image_asset_id,
        "strength": strength,
        "numSamples": num_samples,
        "guidance": guidance,
        "numInferenceSteps": num_inference_steps,
        "modelId": model_id
    }

    response = requests.post(
        "https://api.cloud.scenario.com/v1/generate/img2img",
        headers=headers,
        data=json.dumps(payload)
    )
    try:
        response.raise_for_status()
        response_json = response.json()
        job_id = response_json["jobId"]
        print(f"Generation job started. Job ID: {job_id}")
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error during img2img generation: {e}")
        print(f"Response content: {response.text}")
        raise
    except KeyError:
        print(f"KeyError: 'jobId' not found in response. Full response: {response.json()}")
        raise Exception("Failed to get jobId from img2img response.")

    job_result = poll_job_status(job_id)
    outputs = job_result.get("outputs", [])
    if not outputs:
        raise Exception("No outputs found for generation job.")

    generated_asset_id = outputs[0].get("assetIds")[0]
    print(f"Generated image asset ID: {generated_asset_id}")

    # Remove background
    print("Removing background...")
    remove_bg_payload = {
        "assetId": generated_asset_id,
        "outputFormat": "png"
    }
    response = requests.post(
        "https://api.cloud.scenario.com/v1/generate/remove-background",
        headers=headers,
        data=json.dumps(remove_bg_payload)
    )
    response.raise_for_status()
    remove_bg_job_id = response.json()["jobId"]
    print(f"Background removal job started. Job ID: {remove_bg_job_id}")

    remove_bg_job_result = poll_job_status(remove_bg_job_id)
    remove_bg_outputs = remove_bg_job_result.get("outputs", [])
    if not remove_bg_outputs:
        raise Exception("No outputs found for background removal job.")

    final_image_url = remove_bg_outputs[0].get("url")
    print(f"Final image URL: {final_image_url}")

    # Download and save the image
    image_response = requests.get(final_image_url)
    image_response.raise_for_status()
    with open(output_filename, "wb") as f:
        f.write(image_response.content)
    print(f"Sprite sheet saved to {output_filename}")


if __name__ == "__main__":
    # Ensure a 'generated' directory exists
    output_dir = Path(__file__).parent / 'generated'
    output_dir.mkdir(exist_ok=True)

    # Use the provided asset ID for the reference sprite sheet
    # This ID comes from a successful upload to Scenario.gg's asset service.
    SCENARIO_REFERENCE_ASSET_ID = "asset_aNYJezDQZUtkkikLrnhEkshs"

    # You need to find a suitable model ID from your Scenario.gg account.
    # This is a placeholder. Replace with an actual model ID that supports img2img.
    # You might need to train a custom model or use a public one if available.
    SCENARIO_MODEL_ID = "model_p1dBcEaYQ5jUjB2brcf8bb1W" 

    if SCENARIO_MODEL_ID == "YOUR_SCENARIO_MODEL_ID":
        print("Please replace YOUR_SCENARIO_MODEL_ID with an actual model ID from your Scenario.gg account.")
        print("You can find model IDs in your Scenario.gg dashboard under 'Models'.")
        exit()

    try:
        # Example 1: Male Warrior
        generate_img2img_sprite_sheet(
            prompt="8-bit RPG male warrior character sprite sheet, with a large sword and shield",
            image_asset_id=SCENARIO_REFERENCE_ASSET_ID,
            model_id=SCENARIO_MODEL_ID,
            output_filename=str(output_dir / "male_warrior_scenario.png")
        )

        # Example 2: Female Archer
        generate_img2img_sprite_sheet(
            prompt="8-bit RPG female archer character sprite sheet, with a bow and quiver",
            image_asset_id=SCENARIO_REFERENCE_ASSET_ID,
            model_id=SCENARIO_MODEL_ID,
            output_filename=str(output_dir / "female_archer_scenario.png")
        )

        # Example 3: Goblin Rogue
        generate_img2img_sprite_sheet(
            prompt="8-bit RPG goblin rogue character sprite sheet, with daggers and leather armor",
            image_asset_id=SCENARIO_REFERENCE_ASSET_ID,
            model_id=SCENARIO_MODEL_ID,
            output_filename=str(output_dir / "goblin_rogue_scenario.png")
        )

        # Example 4: Wizard with Staff
        generate_img2img_sprite_sheet(
            prompt="8-bit RPG wizard character sprite sheet, wearing robes and holding a magical staff",
            image_asset_id=SCENARIO_REFERENCE_ASSET_ID,
            model_id=SCENARIO_MODEL_ID,
            output_filename=str(output_dir / "wizard_scenario.png")
        )

        # Example 5: Armored Knight
        generate_img2img_sprite_sheet(
            prompt="8-bit RPG heavily armored knight character sprite sheet, with a full helmet and a longsword",
            image_asset_id=SCENARIO_REFERENCE_ASSET_ID,
            model_id=SCENARIO_MODEL_ID,
            output_filename=str(output_dir / "armored_knight_scenario.png")
        )

    except Exception as e:
        print(f"An error occurred during sprite generation: {e}")
