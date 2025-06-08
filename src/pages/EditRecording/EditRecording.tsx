import React, { useEffect, useRef, useState } from 'react';
import {
    IonPage, IonContent, IonText, IonButton, IonIcon, IonRange, useIonToast
} from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import './EditRecording.css';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';
import { Storage } from '@ionic/storage';

const storage = new Storage();
storage.create();

type PhraseSegment = { start: number; end: number };

const MIN_DURATION = 0.1; // Minimum segment length (in seconds) for any segment

const EditRecording: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [recording, setRecording] = useState<any>(null);
    const [duration, setDuration] = useState(0);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const [sourcePhrase, setSourcePhrase] = useState<PhraseSegment>({ start: 0, end: 0 });
    const [targetPhrase, setTargetPhrase] = useState<PhraseSegment>({ start: 0, end: 0 });
    const [message, setMessage] = useState('');
    const [present] = useIonToast();

    // Error states for warnings below sliders
    const [sourceError, setSourceError] = useState('');
    const [targetError, setTargetError] = useState('');

    function formatTime(t: number) {
        if (!isFinite(t) || isNaN(t) || t < 0) return "--:--";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    useEffect(() => {
        const fetchRecording = async () => {
            try {
                const stored = await storage.get('recordings');
                const parsed = stored || [];
                const match = parsed.find((r: any) => String(r.id) === String(id));
                if (!match) {
                    setMessage('Recording not found.');
                    setRecording(null);
                    return;
                }
                setRecording(match);
            } catch (e) {
                setMessage('Failed to load recording.');
                setRecording(null);
            }
        };
        fetchRecording();
    }, [id]);

    useEffect(() => {
        setAudioLoaded(false);
    }, [recording]);

    const onLoadedMetadata = () => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
        const dur = audioEl.duration || 0;
        setDuration(dur);
        // Start with original as [0, half], translation as [half, end]
        const half = parseFloat((dur / 2).toFixed(2));
        setSourcePhrase({ start: 0, end: half });
        setTargetPhrase({ start: half, end: dur });
        setAudioLoaded(true);
    };

    // Validate segments on every update
    useEffect(() => {
        let sourceMsg = '';
        let targetMsg = '';
        if (sourcePhrase.end - sourcePhrase.start < MIN_DURATION) {
            sourceMsg = 'Segment must be at least 0.1s long.';
        }
        if (targetPhrase.end - targetPhrase.start < MIN_DURATION) {
            targetMsg = 'Segment must be at least 0.1s long.';
        }
        if (sourcePhrase.end > targetPhrase.start) {
            sourceMsg = 'Original must end before translation starts.';
            targetMsg = 'Translation must start after original ends.';
        }
        setSourceError(sourceMsg);
        setTargetError(targetMsg);
    }, [sourcePhrase, targetPhrase]);

    const isValidSegments = () => {
        if (sourcePhrase.end - sourcePhrase.start < MIN_DURATION) return false;
        if (targetPhrase.end - targetPhrase.start < MIN_DURATION) return false;
        if (sourcePhrase.end > targetPhrase.start) return false;
        if (sourcePhrase.start < 0 || sourcePhrase.end > duration) return false;
        if (targetPhrase.start < 0 || targetPhrase.end > duration) return false;
        return true;
    };

    const previewSegment = async (start: number, end: number) => {
        if (!recording || !recording.audioData) return;
        try {
            const blob = await fetch(recording.audioData).then(res => res.blob());
            const buffer = await blob.arrayBuffer();
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const decoded = await audioCtx.decodeAudioData(buffer);
            const sampleRate = decoded.sampleRate;
            const firstSample = Math.floor(start * sampleRate);
            const lastSample = Math.floor(end * sampleRate);
            const length = lastSample - firstSample;
            const trimmedBuffer = audioCtx.createBuffer(
                decoded.numberOfChannels, length, sampleRate
            );
            for (let ch = 0; ch < decoded.numberOfChannels; ++ch) {
                trimmedBuffer.copyToChannel(
                    decoded.getChannelData(ch).slice(firstSample, lastSample), ch
                );
            }
            const previewBlob = audioBufferToWavBlob(trimmedBuffer, sampleRate);
            const url = URL.createObjectURL(previewBlob);
            const previewAudio = new Audio(url);
            previewAudio.play();
        } catch (e) {
            present({ message: 'Failed to preview segment.', duration: 1800, color: 'danger' });
        }
    };

    function audioBufferToWavBlob(buffer: AudioBuffer, sampleRate: number) {
        const numChannels = buffer.numberOfChannels;
        const length = buffer.length * numChannels * 2 + 44;
        const wav = new ArrayBuffer(length);
        const view = new DataView(wav);
        function writeString(offset: number, str: string) {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        }
        let offset = 0;
        writeString(offset, 'RIFF'); offset += 4;
        view.setUint32(offset, length - 8, true); offset += 4;
        writeString(offset, 'WAVE'); offset += 4;
        writeString(offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2;
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4;
        view.setUint16(offset, numChannels * 2, true); offset += 2;
        view.setUint16(offset, 16, true); offset += 2;
        writeString(offset, 'data'); offset += 4;
        view.setUint32(offset, length - 44, true); offset += 4;
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                let sample = buffer.getChannelData(ch)[i];
                sample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        return new Blob([wav], { type: 'audio/wav' });
    }

    const saveEdits = async () => {
        // Final validation before save
        if (!isValidSegments()) {
            present({ message: 'Choose valid segment times! Segments must be at least 0.1s long and not overlap.', duration: 2400, color: 'danger' });
            return;
        }
        if (!recording || !recording.audioData) {
            present({ message: 'No recording loaded.', duration: 1800, color: 'danger' });
            return;
        }
        try {
            const audioBufferToWavBase64 = async (buffer: AudioBuffer, sampleRate: number) => {
                const numChannels = buffer.numberOfChannels;
                const length = buffer.length * numChannels * 2 + 44;
                const wav = new ArrayBuffer(length);
                const view = new DataView(wav);

                function writeString(offset: number, str: string) {
                    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
                }
                let offset = 0;
                writeString(offset, 'RIFF'); offset += 4;
                view.setUint32(offset, length - 8, true); offset += 4;
                writeString(offset, 'WAVE'); offset += 4;
                writeString(offset, 'fmt '); offset += 4;
                view.setUint32(offset, 16, true); offset += 4;
                view.setUint16(offset, 1, true); offset += 2;
                view.setUint16(offset, numChannels, true); offset += 2;
                view.setUint32(offset, sampleRate, true); offset += 4;
                view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4;
                view.setUint16(offset, numChannels * 2, true); offset += 2;
                view.setUint16(offset, 16, true); offset += 2;
                writeString(offset, 'data'); offset += 4;
                view.setUint32(offset, length - 44, true); offset += 4;
                for (let i = 0; i < buffer.length; i++) {
                    for (let ch = 0; ch < numChannels; ch++) {
                        let sample = buffer.getChannelData(ch)[i];
                        sample = Math.max(-1, Math.min(1, sample));
                        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                        offset += 2;
                    }
                }
                const wavBlob = new Blob([wav], { type: 'audio/wav' });
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(wavBlob);
                });
                return base64;
            };

            const extractSegment = async (start: number, end: number) => {
                const blob = await fetch(recording.audioData).then(res => res.blob());
                const buffer = await blob.arrayBuffer();
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const decoded = await audioCtx.decodeAudioData(buffer);
                const sampleRate = decoded.sampleRate;
                const firstSample = Math.floor(start * sampleRate);
                const lastSample = Math.floor(end * sampleRate);
                const length = lastSample - firstSample;
                const trimmedBuffer = audioCtx.createBuffer(
                    decoded.numberOfChannels, length, sampleRate
                );
                for (let ch = 0; ch < decoded.numberOfChannels; ++ch) {
                    trimmedBuffer.copyToChannel(
                        decoded.getChannelData(ch).slice(firstSample, lastSample), ch
                    );
                }
                return { trimmedBuffer, sampleRate };
            };

            const [orig, trans] = await Promise.all([
                extractSegment(sourcePhrase.start, sourcePhrase.end),
                extractSegment(targetPhrase.start, targetPhrase.end),
            ]);

            const [origBase64, transBase64] = await Promise.all([
                audioBufferToWavBase64(orig.trimmedBuffer, orig.sampleRate),
                audioBufferToWavBase64(trans.trimmedBuffer, trans.sampleRate),
            ]);

            const timestamp = Date.now();
            const origRecording = {
                id: `${timestamp}_orig`,
                filename: `original_${timestamp}.wav`,
                audioData: origBase64,
                date: new Date().toISOString(),
            };
            const transRecording = {
                id: `${timestamp}_trans`,
                filename: `translated_${timestamp}.wav`,
                audioData: transBase64,
                date: new Date().toISOString(),
            };

            const stored = await storage.get('recordings');
            const recordings = stored || [];
            recordings.push(origRecording, transRecording);
            await storage.set('recordings', recordings);

            present({ message: 'Both segments saved successfully!', duration: 2000, color: 'success' });
            setTimeout(() => history.push('/recording-library'), 1000);
        } catch (err) {
            present({ message: 'Failed to save segments.', duration: 2000, color: 'danger' });
        }
    };

    return (
        <IonPage>
            <IonContent className="edit-recording-page">
                <div className="edit-wrapper">
                    <div className="edit-header">
                        <IonButton fill="clear" className="back-btn" onClick={() => history.goBack()}>
                            <IonIcon icon={arrowBackOutline} slot="icon-only" />
                        </IonButton>
                        <IonText className="edit-title">Edit Recording</IonText>
                        <ProfileIcon />
                    </div>
                    {message && <div className="edit-error">{message}</div>}
                    {recording && (
                        <>
                            <audio
                                ref={audioRef}
                                src={recording.audioData}
                                controls
                                className="edit-audio"
                                onLoadedMetadata={onLoadedMetadata}
                            />
                            {audioLoaded && (
                                <>
                                    {/* Original Phrase Segment */}
                                    <div className="segment-card">
                                        <IonText color="primary"><h2>Original Phrase</h2></IonText>
                                        <div className="range-group">
                                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 6 }}>
                                                <span>Start: {formatTime(sourcePhrase.start)}</span>
                                                <span>End: {formatTime(sourcePhrase.end)}</span>
                                            </div>
                                            <IonRange
                                                min={0}
                                                max={targetPhrase.start > 0 ? targetPhrase.start - 0.01 : duration}
                                                value={{ lower: sourcePhrase.start, upper: sourcePhrase.end }}
                                                dualKnobs
                                                pin
                                                step={0.01}
                                                onIonChange={e => {
                                                    const { lower, upper } = e.detail.value as { lower: number; upper: number };
                                                    // Clamp original phrase end so it never reaches or exceeds translation start (but only if translation is set)
                                                    const safeUpper = targetPhrase.start > 0 ? Math.min(upper, targetPhrase.start - 0.01) : Math.min(upper, duration);
                                                    const safeLower = Math.max(lower, 0);
                                                    setSourcePhrase({ start: safeLower, end: safeUpper });
                                                    // If translation start is before new original end, shift translation start too
                                                    if (targetPhrase.start < safeUpper) {
                                                        setTargetPhrase(tp => ({
                                                            ...tp,
                                                            start: safeUpper
                                                        }));
                                                    }
                                                }}
                                            />
                                            {sourceError && <div style={{ color: "#FF4D4D", fontWeight: 600, fontSize: "0.96em", marginTop: 4 }}>{sourceError}</div>}
                                        </div>
                                        <IonButton className="trim-btn" onClick={() => previewSegment(sourcePhrase.start, sourcePhrase.end)}>
                                            Preview Original
                                        </IonButton>
                                    </div>
                                    {/* Translated Phrase Segment */}
                                    <div className="segment-card">
                                        <IonText color="primary"><h2>Translated Phrase</h2></IonText>
                                        <div className="range-group">
                                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 6 }}>
                                                <span>Start: {formatTime(targetPhrase.start)}</span>
                                                <span>End: {formatTime(targetPhrase.end)}</span>
                                            </div>
                                            <IonRange
                                                min={sourcePhrase.end + 0.01}
                                                max={duration}
                                                value={{
                                                    lower: Math.max(targetPhrase.start, sourcePhrase.end + 0.01),
                                                    upper: targetPhrase.end
                                                }}
                                                dualKnobs
                                                pin
                                                step={0.01}
                                                onIonChange={e => {
                                                    const { lower, upper } = e.detail.value as { lower: number; upper: number };
                                                    // Clamp translation start to at least original end
                                                    const safeLower = Math.max(lower, sourcePhrase.end + 0.01);
                                                    const safeUpper = Math.max(upper, safeLower + 0.01);
                                                    setTargetPhrase({ start: safeLower, end: safeUpper });
                                                }}
                                            />
                                            {targetError && <div style={{ color: "#FF4D4D", fontWeight: 600, fontSize: "0.96em", marginTop: 4 }}>{targetError}</div>}
                                        </div>
                                        <IonButton className="trim-btn" onClick={() => previewSegment(targetPhrase.start, targetPhrase.end)}>
                                            Preview Translation
                                        </IonButton>
                                    </div>
                                    <IonButton
                                        expand="block"
                                        color="success"
                                        className="save-btn"
                                        onClick={saveEdits}
                                        disabled={!isValidSegments()}
                                    >
                                        Save Both Segments
                                    </IonButton>
                                    {!isValidSegments() && (
                                        <div style={{ color: "#FF4D4D", fontWeight: 600, marginTop: 10 }}>
                                            Choose valid segment times to enable saving!
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default EditRecording;