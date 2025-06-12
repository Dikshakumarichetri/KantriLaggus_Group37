import React, { useEffect, useRef, useState } from 'react';
import {
    IonPage, IonContent, IonText, IonButton, IonIcon, IonRange, useIonToast, IonSpinner
} from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import './EditRecording.css';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';
import { Storage } from '@ionic/storage';

const storage = new Storage();
storage.create();

type PhraseSegment = { start: number; end: number };

const EditRecording: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [recording, setRecording] = useState<any>(null);
    const [duration, setDuration] = useState<number>(0);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [sourcePhrase, setSourcePhrase] = useState<PhraseSegment>({ start: 0, end: 0 });
    const [targetPhrase, setTargetPhrase] = useState<PhraseSegment>({ start: 0, end: 0 });
    const [message, setMessage] = useState('');
    const [present] = useIonToast();

    // Format seconds as mm:ss
    function formatTime(t: number) {
        if (!isFinite(t) || isNaN(t) || t < 0) return "--:--";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // Load recording and set duration from storage
    useEffect(() => {
        const fetchRecording = async () => {
            setShowEditor(false);
            setAudioLoaded(false);
            setMessage('');
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

                // Always use the stored duration, fallback only if needed
                if (match.duration && isFinite(match.duration) && match.duration > 0) {
                    setDuration(match.duration);
                    const half = parseFloat((match.duration / 2).toFixed(2));
                    setSourcePhrase({ start: 0, end: half });
                    setTargetPhrase({ start: half, end: match.duration });
                    setAudioLoaded(true);
                    setTimeout(() => setShowEditor(true), 2000);
                } else {
                    // fallback: wait for onLoadedMetadata to set duration
                    setDuration(0);
                    setMessage('Audio length missing – loading metadata...');
                    setAudioLoaded(false);
                }
            } catch (e) {
                setMessage('Failed to load recording.');
                setRecording(null);
            }
        };
        fetchRecording();
    }, [id]);

    // Wait 2s after audio loads to show editor
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (audioLoaded && duration > 0 && !showEditor) {
            timer = setTimeout(() => setShowEditor(true), 2000);
        }
        return () => clearTimeout(timer);
    }, [audioLoaded, duration, showEditor]);

    // Handle audio metadata loading if duration was not found in storage
    const onLoadedMetadata = () => {
        if (duration > 0) return; // Already set from storage
        const audioEl = audioRef.current;
        if (!audioEl) return;
        let dur = audioEl.duration;
        console.log("audioRef.duration from HTML:", dur, "src type:", (recording?.audioData || '').slice(0, 32));
        if (!isFinite(dur) || dur <= 0) {
            setMessage(
                (recording?.audioData || '').startsWith('data:audio/webm')
                    ? "WebM playback not supported in this browser. Try Chrome or Edge."
                    : "Audio file has invalid duration! Please try a different browser or file."
            );
            setDuration(0);
            setShowEditor(false);
            return;
        }
        setDuration(dur);
        const half = parseFloat((dur / 2).toFixed(2));
        setSourcePhrase({ start: 0, end: half });
        setTargetPhrase({ start: half, end: dur });
        setAudioLoaded(true);
        setTimeout(() => setShowEditor(true), 2000);
    };

    // Preview helper (plays only the segment)
    const previewSegment = (start: number, end: number) => {
        if (!recording?.audioData) return;
        const audio = new Audio(recording.audioData);
        audio.currentTime = start;
        audio.play();
        setTimeout(() => {
            audio.pause();
        }, (end - start) * 1000);
    };

    // Save logic unchanged
    const saveEdits = async () => {
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

    const canRenderSliders = showEditor && audioLoaded && duration > 0;

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
                            {/* Always use the correct data URL for playback */}
                            <audio
                                ref={audioRef}
                                src={recording.audioData}
                                controls
                                className="edit-audio"
                                onLoadedMetadata={onLoadedMetadata}
                            />

                            {!canRenderSliders && (
                                <div style={{ margin: 40, textAlign: 'center', color: '#888' }}>
                                    <IonSpinner name="crescent" />
                                    <div style={{ marginTop: 10 }}>
                                        {audioLoaded
                                            ? "Loading editor..."
                                            : "Loading audio..."}
                                    </div>
                                </div>
                            )}

                            {canRenderSliders && (
                                <>
                                    {/* Original Phrase Segment */}
                                    <div className="segment-card">
                                        <IonText color="primary"><h2>Original Phrase</h2></IonText>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 6 }}>
                                            <span>Start: {formatTime(sourcePhrase.start)}</span>
                                            <span>End: {formatTime(sourcePhrase.end)}</span>
                                        </div>
                                        <IonRange
                                            min={0}
                                            max={duration}
                                            value={{ lower: sourcePhrase.start, upper: sourcePhrase.end }}
                                            dualKnobs
                                            pin
                                            step={0.01}
                                            onIonChange={e => {
                                                const { lower, upper } = e.detail.value as { lower: number; upper: number };
                                                setSourcePhrase({ start: Math.max(0, lower), end: Math.min(upper, duration) });
                                                // keep translation start after original end
                                                if (targetPhrase.start < upper) {
                                                    setTargetPhrase(tp => ({
                                                        ...tp,
                                                        start: upper + 0.01
                                                    }));
                                                }
                                            }}
                                        />
                                        <IonButton className="trim-btn" onClick={() => previewSegment(sourcePhrase.start, sourcePhrase.end)}>
                                            Preview Original
                                        </IonButton>
                                    </div>
                                    {/* Translated Phrase Segment */}
                                    <div className="segment-card">
                                        <IonText color="primary"><h2>Translated Phrase</h2></IonText>
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
                                                setTargetPhrase({ start: Math.max(lower, sourcePhrase.end + 0.01), end: Math.max(upper, lower + 0.01) });
                                            }}
                                        />
                                        <IonButton className="trim-btn" onClick={() => previewSegment(targetPhrase.start, targetPhrase.end)}>
                                            Preview Translation
                                        </IonButton>
                                    </div>
                                    <IonButton expand="block" color="success" className="save-btn" onClick={saveEdits}>
                                        Save Both Segments
                                    </IonButton>
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