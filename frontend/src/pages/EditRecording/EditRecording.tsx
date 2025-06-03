import React, { useEffect, useRef, useState } from 'react';
import {
    IonPage, IonContent, IonButton, IonIcon, IonRange, IonText
} from '@ionic/react';
import { arrowBackOutline, createOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import './EditRecording.css';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';

const API_URL = 'http://localhost:3001';

const EditRecording: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const audioRef = useRef<HTMLAudioElement>(null);

    const [filename, setFilename] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [trimmedUrl, setTrimmedUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showEditControls, setShowEditControls] = useState(false);

    const authToken = localStorage.getItem('authToken');

    // Fetch metadata
    useEffect(() => {
        if (!id) return;
        fetch(`${API_URL}/api/recordings/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        })
            .then(res => res.json())
            .then(data => setFilename(data.filename))
            .catch(() => setError('Failed to load metadata'));
    }, [id, authToken]);

    // Fetch audio and force-load
    useEffect(() => {
        if (!filename) return;
        const url = `${API_URL}/recordings/${filename}`;
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                const localUrl = URL.createObjectURL(blob);
                setAudioUrl(localUrl);
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.load();
                    }
                }, 50);
            })
            .catch(() => setError('Failed to load audio'));
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (trimmedUrl) URL.revokeObjectURL(trimmedUrl);
        };
        // eslint-disable-next-line
    }, [filename]);

    // Get duration
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleMetadata = () => {
            if (audio.duration) {
                setDuration(audio.duration);
                setStartTime(0);
                setEndTime(audio.duration);
            }
        };

        audio.addEventListener('loadedmetadata', handleMetadata);
        return () => {
            audio.removeEventListener('loadedmetadata', handleMetadata);
        };
    }, [audioUrl]);

    const trimAudio = async () => {
        if (!audioUrl || endTime <= startTime || duration === 0) return;
        setSaving(true);
        setSuccess('');
        setError('');
        try {
            const blob = await (await fetch(audioUrl)).blob();
            const arrayBuffer = await blob.arrayBuffer();
            const ctx = new AudioContext();
            const srcBuffer = await ctx.decodeAudioData(arrayBuffer);

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

            const wavBlob = encodeWAV(trimmedBuffer);
            const previewUrl = URL.createObjectURL(wavBlob);
            setTrimmedUrl(previewUrl);

            const formData = new FormData();
            formData.append('audio', wavBlob, filename.replace(/\.webm$/, '.wav'));

            const response = await fetch(`${API_URL}/recordings/${filename}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${authToken}` },
                body: formData
            });

            setSaving(false);
            if (response.ok) {
                setSuccess('Trimmed & Saved!');
            } else {
                setError('Failed to save trimmed audio.');
            }
        } catch (err) {
            setSaving(false);
            setError('Error processing or uploading audio.');
        }
    };

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
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>
                    <ProfileIcon />
                    <IonText className="edit-title">Edit Recording</IonText>                       

                    {error && <IonText color="danger">{error}</IonText>}
                    {audioUrl && (
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            preload="auto"
                            controls
                            className="edit-audio"
                        />
                    )}
                    {audioUrl && (
                        <IonButton fill="clear" size="small" className="edit-btn"   expand="block"
                        color="medium"
                        onClick={() => setShowEditControls(true)}>
                        <IonIcon icon={createOutline} slot="start" color="dark"/>
                        <span style={{ color: 'white' }}>Edit Recording</span>
                        </IonButton>
                      
                      
                    )}
                    {showEditControls && duration > 0 && (
                        <>
                            <div className="range-group">
                                <IonText>Start: {startTime.toFixed(2)}s</IonText>
                                <IonRange
                                    min={0}
                                    max={duration}
                                    step={0.01}
                                    value={startTime}
                                    onIonChange={e => setStartTime(Math.min(e.detail.value as number, endTime - 0.01))}
                                />
                                <IonText>End: {endTime.toFixed(2)}s</IonText>
                                <IonRange
                                    min={0}
                                    max={duration}
                                    step={0.01}
                                    value={endTime}
                                    onIonChange={e => setEndTime(Math.max(e.detail.value as number, startTime + 0.01))}
                                />
                            </div>
                            <IonButton expand="block" fill="clear" onClick={playTrimmed} color="dark">
                                Preview Trimmed Region
                            </IonButton>
                            <IonButton expand="block" fill="solid" color="primary" onClick={trimAudio} disabled={saving}>
                                {saving ? "Saving..." : "Save Trim"}
                            </IonButton>
                        </>
                    )}
                    {success && <IonText color="success">{success}</IonText>}
                    {trimmedUrl && (
                        <audio src={trimmedUrl} controls style={{ marginTop: 12 }} />
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default EditRecording;
