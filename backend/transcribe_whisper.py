import sys
import whisper


def transcribe(audio_path, language=None):
    model = whisper.load_model(
        "base"
    )  # or "small", "medium", "large" (larger = slower, better)
    result = model.transcribe(audio_path, language=language)
    print(result["text"])


if __name__ == "__main__":
    audio_file = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else None
    transcribe(audio_file, language)
