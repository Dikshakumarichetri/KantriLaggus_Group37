import React, { useRef, useState } from "react";
import { IonModal, IonButton, IonRange, IonText } from "@ionic/react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    audioUrl: string;
    filename: string;
}

const AudioEditorModal: React.FC<Props> = ({ isOpen, onClose, audioUrl, filename }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [trim, setTrim] = useState({ start: 0, end: 0 });
    const [duration, setDuration] = useState(0);

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setTrim({ start: 0, end: audioRef.current.duration });
        }
    };

    const handleRangeChange = (e: any) => {
        setTrim({ start: e.detail.value.lower, end: e.detail.value.upper });
        if (audioRef.current) {
            audioRef.current.currentTime = e.detail.value.lower;
        }
    };

    // Trimming in browser, exports a .webm clip!
    const handleExportTrim = async () => {
        const originalAudio = await fetch(audioUrl).then((r) => r.arrayBuffer());
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(originalAudio.slice(0));

        const sampleRate = decoded.sampleRate;
        const startSample = Math.floor(trim.start * sampleRate);
        const endSample = Math.floor(trim.end * sampleRate);

        const length = endSample - startSample;
        const trimmed = ctx.createBuffer(decoded.numberOfChannels, length, sampleRate);

        for (let ch = 0; ch < decoded.numberOfChannels; ++ch) {
            trimmed.getChannelData(ch).set(decoded.getChannelData(ch).slice(startSample, endSample));
        }

        // Export as WAV
        function encodeWAV(audioBuffer: AudioBuffer) {
            const numChannels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const format = 1; // PCM
            const bitDepth = 16;
            const numSamples = audioBuffer.length;

            let buffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
            let view = new DataView(buffer);

            function writeString(view: DataView, offset: number, str: string) {
                for (let i = 0; i < str.length; i++) {
                    view.setUint8(offset + i, str.charCodeAt(i));
                }
            }

            let offset = 0;
            writeString(view, offset, "RIFF");
            offset += 4;
            view.setUint32(offset, 36 + numSamples * numChannels * 2, true);
            offset += 4;
            writeString(view, offset, "WAVE");
            offset += 4;
            writeString(view, offset, "fmt ");
            offset += 4;
            view.setUint32(offset, 16, true);
            offset += 4;
            view.setUint16(offset, format, true);
            offset += 2;
            view.setUint16(offset, numChannels, true);
            offset += 2;
            view.setUint32(offset, sampleRate, true);
            offset += 4;
            view.setUint32(offset, sampleRate * numChannels * 2, true);
            offset += 4;
            view.setUint16(offset, numChannels * 2, true);
            offset += 2;
            view.setUint16(offset, bitDepth, true);
            offset += 2;
            writeString(view, offset, "data");
            offset += 4;
            view.setUint32(offset, numSamples * numChannels * 2, true);
            offset += 4;

            // Write PCM samples
            for (let i = 0; i < numSamples; i++) {
                for (let ch = 0; ch < numChannels; ch++) {
                    let sample = audioBuffer.getChannelData(ch)[i];
                    sample = Math.max(-1, Math.min(1, sample));
                    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
                    offset += 2;
                }
            }
            return new Blob([buffer], { type: "audio/wav" });
        }

        const wavBlob = encodeWAV(trimmed);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(wavBlob);
        link.download = `trimmed-${filename.replace(/\.[^/.]+$/, "")}.wav`;
        link.click();
    };

    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose}>
            <div style={{ padding: 24, background: "#1F315B", minHeight: 300 }}>
                <IonText color="light"><h2>Edit Recording</h2></IonText>
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    style={{ width: "100%", marginBottom: 20 }}
                    onLoadedMetadata={handleLoadedMetadata}
                />
                {duration > 0 && (
                    <>
                        <IonRange
                            min={0}
                            max={duration}
                            step={0.01}
                            value={{ lower: trim.start, upper: trim.end }}
                            dualKnobs
                            onIonChange={handleRangeChange}
                            color="primary"
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", color: "white", marginTop: 8 }}>
                            <span>Start: {trim.start.toFixed(2)}s</span>
                            <span>End: {trim.end.toFixed(2)}s</span>
                        </div>
                        <IonButton expand="block" onClick={handleExportTrim} style={{ marginTop: 20 }}>
                            Download Trimmed Audio
                        </IonButton>
                        <IonButton expand="block" color="medium" onClick={onClose}>
                            Close
                        </IonButton>
                    </>
                )}
            </div>
        </IonModal>
    );
};

export default AudioEditorModal;