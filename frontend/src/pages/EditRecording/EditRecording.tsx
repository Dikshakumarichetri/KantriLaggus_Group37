import React, { useEffect, useRef, useState } from 'react';
import {
    IonPage, IonContent, IonButton, IonIcon, IonRange, IonText
} from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import './EditRecording.css';

const API_URL = 'http://localhost:3001';

const EditRecording: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const audioRef = useRef<HTMLAudioElement>(null);

    // State hooks
    const [filename, setFilename] = useState<string>('');
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [duration, setDuration] = useState<number>(0);
    const [startTime, setStartTime] = useState<number>(0);
    const [endTime, setEndTime] = useState<number>(0);
    const [trimmedUrl, setTrimmedUrl] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const authToken = localStorage.getItem('authToken');

    // 1. Fetch metadata for this recording (get filename)
    useEffect(() => {
        if (!id) return;
        fetch(`${API_URL}/api/recordings/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Metadata not found');
                return res.json();
            })
            .then(rec => {
                setFilename(rec.filename);
            })
            .catch(() => setError('Could not load audio metadata'));
    }, [id, authToken]);

    // 2. Once filename is available, fetch the audio file
    useEffect(() => {
        if (!filename) return;
        fetch(`${API_URL}/recordings/${filename}`)
            .then(res => {
                if (!res.ok) throw new Error('Audio not found');
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            })
            .catch(() => setError('Could not load audio'));
        // Clean up
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (trimmedUrl) URL.revokeObjectURL(trimmedUrl);
        };
        // eslint-disable-next-line
    }, [filename]);

    // 3. Set duration after metadata loads
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        let raf: number;
        const checkDuration = () => {
            if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                setDuration(audio.duration);
                setStartTime(0);
                setEndTime(audio.duration);
            } else {
                raf = window.requestAnimationFrame(checkDuration);
            }
        };
        audio.addEventListener('loadedmetadata', checkDuration);
        if (audio.readyState >= 1) checkDuration();
        return () => {
            audio.removeEventListener('loadedmetadata', checkDuration);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [audioUrl]);

    // 4. Trim and save new audio file
    const trimAudio = async () => {
        if (!audioUrl || endTime <= startTime || duration === 0) return;
        setSaving(true);
        setSuccess('');
        setError('');
        try {
            const resp = await fetch(audioUrl);
            const blob = await resp.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const ctx = new AudioContext();
            const srcBuffer = await ctx.decodeAudioData(arrayBuffer);

            // Slice buffer
            const sampleRate = srcBuffer.sampleRate;
            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.floor(endTime * sampleRate);
            const frameCount = endSample - startSample;
            const numChannels = srcBuffer.numberOfChannels;
            const trimmedBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
            for (let ch = 0; ch < numChannels; ch++) {
                const channel = srcBuffer.getChannelData(ch).slice(startSample, endSample);
                trimmedBuffer.copyToChannel(channel, ch, 0);
            }

            // Encode as WAV and preview
            const wavBlob = encodeWAV(trimmedBuffer);
            const trimmedAudioUrl = URL.createObjectURL(wavBlob);
            setTrimmedUrl(trimmedAudioUrl);

            // Upload trimmed blob to server (overwrite)
            const formData = new FormData();
            formData.append('audio', wavBlob, filename.replace(/\.webm$/, '.wav'));

            const response = await fetch(`${API_URL}/recordings/${filename}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${authToken}` },
                body: formData,
            });

            setSaving(false);
            if (response.ok) {
                setSuccess('Trimmed & Saved!');
            } else {
                setError('Failed to save. Check your login or server.');
            }
        } catch (err) {
            setSaving(false);
            setError('Error processing or uploading audio.');
        }
    };

    // Preview trimmed region only
    const playTrimmed = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = startTime;
        audioRef.current.play();
        const stopAt = () => {
            if (audioRef.current && audioRef.current.currentTime >= endTime) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('timeupdate', stopAt);
            }
        };
        audioRef.current.addEventListener('timeupdate', stopAt);
    };

    // Encode WAV Helper
    function encodeWAV(buffer: AudioBuffer): Blob {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const samples = buffer.length;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = samples * blockAlign;
        const bufferLength = 44 + dataSize;
        const view = new DataView(new ArrayBuffer(bufferLength));
        let offset = 0;

        const writeString = (s: string) => {
            for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
            offset += s.length;
        };
        writeString('RIFF');
        view.setUint32(offset, 36 + dataSize, true); offset += 4;
        writeString('WAVE');
        writeString('fmt ');
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2;
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, byteRate, true); offset += 4;
        view.setUint16(offset, blockAlign, true); offset += 2;
        view.setUint16(offset, 16, true); offset += 2;
        writeString('data');
        view.setUint32(offset, dataSize, true); offset += 4;
        // PCM samples
        for (let i = 0; i < samples; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                let sample = buffer.getChannelData(ch)[i];
                sample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        return new Blob([view], { type: 'audio/wav' });
    }

    return (
        <IonPage>
            <IonContent className="edit-recording-page" fullscreen>
                <div className="edit-wrapper">
                    <IonButton fill="clear" className="back-btn" onClick={() => history.push('/recording-library')}>
                        <IonIcon icon={arrowBackOutline} slot='icon-only' />
                    </IonButton>
                    <IonText className="edit-title">Edit Recording</IonText>
                    {error && <IonText color="danger">{error}</IonText>}
                    {!duration && (
                        <div style={{ margin: "32px auto", color: "#9cbcff" }}>
                            Loading audio...
                        </div>
                    )}
                    {audioUrl && (
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            controls
                            className="edit-audio"
                        />
                    )}
                    {duration > 0 && (
                        <div className="range-group">
                            <IonText>Start: {startTime.toFixed(2)}s</IonText>
                            <IonRange
                                min={0}
                                max={duration}
                                step={0.01}
                                value={startTime}
                                onIonChange={e => {
                                    const val = e.detail.value as number;
                                    setStartTime(Math.min(val, endTime - 0.01));
                                }}
                            />
                            <IonText>End: {endTime.toFixed(2)}s</IonText>
                            <IonRange
                                min={0}
                                max={duration}
                                step={0.01}
                                value={endTime}
                                onIonChange={e => {
                                    const val = e.detail.value as number;
                                    setEndTime(Math.max(val, startTime + 0.01));
                                }}
                            />
                        </div>
                    )}
                    {duration > 0 && (
                        <>
                            <IonButton expand="block" className="trim-btn" fill="clear" onClick={playTrimmed}>
                                Preview Trimmed Region
                            </IonButton>
                            <IonButton expand="block" className="save-btn" fill="clear" onClick={trimAudio} disabled={saving}>
                                {saving ? "Saving..." : "Save Trim"}
                            </IonButton>
                        </>
                    )}
                    {trimmedUrl &&
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <IonText color="success">{success}</IonText>
                            <audio src={trimmedUrl} controls style={{ display: 'block', margin: '12px auto 0 auto' }} />
                        </div>
                    }
                </div>
            </IonContent>
        </IonPage>
    );
};

export default EditRecording;