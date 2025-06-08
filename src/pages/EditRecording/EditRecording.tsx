import React, { useEffect, useRef, useState } from 'react';
import {
    IonPage, IonContent, IonButton, IonIcon, IonRange, IonText, IonInput, useIonToast
} from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import './EditRecording.css';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';
import { Storage } from '@ionic/storage';

const storage = new Storage();
storage.create();

const EditRecording: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [recording, setRecording] = useState<any>(null);
    const [duration, setDuration] = useState(0);
    const [sourcePhrase, setSourcePhrase] = useState({ label: '', start: 0, end: 0 });
    const [targetPhrase, setTargetPhrase] = useState({ label: '', start: 0, end: 0 });
    const [message, setMessage] = useState('');
    const [present] = useIonToast();

    useEffect(() => {
        const fetchRecording = async () => {
            const stored = await storage.get('recordings');
            const parsed = stored ? JSON.parse(stored) : [];
            const match = parsed.find((r: any) => String(r.id) === id);
            if (!match) {
                setMessage('Recording not found.');
                return;
            }
            setRecording(match);
        };
        fetchRecording();
    }, [id]);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const handleMeta = () => {
            const dur = audioEl.duration || 0;
            setDuration(dur);
            setSourcePhrase(p => ({ ...p, end: parseFloat((dur / 2).toFixed(2)) }));
            setTargetPhrase(p => ({ ...p, start: parseFloat((dur / 2).toFixed(2)), end: dur }));
        };

        audioEl.addEventListener('loadedmetadata', handleMeta);
        return () => {
            audioEl.removeEventListener('loadedmetadata', handleMeta);
        };
    }, [recording]);

    const previewSegment = async (start: number, end: number) => {
        if (!recording) return;
        try {
            const blob = await fetch(recording.audioData).then(res => res.blob());
            const buffer = await blob.arrayBuffer();
            const ctx = new AudioContext();
            const decoded = await ctx.decodeAudioData(buffer);
            const sampleRate = decoded.sampleRate;
            const startSample = Math.floor(start * sampleRate);
            const endSample = Math.floor(end * sampleRate);
            const segmentLength = endSample - startSample;

            const segmentBuffer = ctx.createBuffer(decoded.numberOfChannels, segmentLength, sampleRate);
            for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
                const segmentData = decoded.getChannelData(ch).slice(startSample, endSample);
                segmentBuffer.copyToChannel(segmentData, ch);
            }

            const source = ctx.createBufferSource();
            source.buffer = segmentBuffer;
            source.connect(ctx.destination);
            source.start(0);
        } catch (err: any) {
            console.error(err);
            setMessage("Failed to preview segment: " + err.message);
        }
    };

    const saveTrimmedPhrases = async () => {
        if (!sourcePhrase.label || !targetPhrase.label) {
            present({ message: 'Please label and mark both phrases before saving.', duration: 1800, color: 'danger' });
            return;
        }

        const updated = {
            ...recording,
            sourcePhrase,
            targetPhrase,
            date: new Date().toISOString()
        };

        const stored = await storage.get('recordings');
        const parsed = stored ? JSON.parse(stored) : [];
        const updatedList = parsed.map((r: any) => r.id === updated.id ? updated : r);
        await storage.set('recordings', JSON.stringify(updatedList));

        present({ message: 'Phrases saved!', duration: 1500, color: 'success' });
        history.push('/phraselist');
    };

    return (
        <IonPage>
            <IonContent className="edit-recording-page" fullscreen>
                <div className="edit-wrapper">
                    <IonButton fill="clear" className="back-btn" onClick={() => history.push('/recording-library')}>
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>
                    <ProfileIcon />
                    <IonText className="edit-title">Mark and Preview Phrases</IonText>

                    {recording && (
                        <audio
                            ref={audioRef}
                            src={recording.audioData}
                            preload="auto"
                            controls
                            className="edit-audio"
                        />
                    )}

                    {[{ label: 'Source Phrase', phrase: sourcePhrase, setPhrase: setSourcePhrase },
                      { label: 'Translation Phrase', phrase: targetPhrase, setPhrase: setTargetPhrase }].map(({ label, phrase, setPhrase }) => (
                        <div key={label} style={{ marginTop: 24 }}>
                            <IonText><strong>{label}</strong></IonText>
                            <IonInput
                                value={phrase.label}
                                placeholder={`${label} label`}
                                onIonChange={e => setPhrase(p => ({ ...p, label: e.detail.value! }))}
                            />
                            <IonText>Start: {phrase.start.toFixed(2)}s</IonText>
                            <IonRange
                                min={0}
                                max={duration}
                                step={0.01}
                                value={phrase.start}
                                onIonChange={e => setPhrase(p => ({ ...p, start: Math.min(e.detail.value as number, phrase.end - 0.01) }))}
                            />
                            <IonText>End: {phrase.end.toFixed(2)}s</IonText>
                            <IonRange
                                min={0}
                                max={duration}
                                step={0.01}
                                value={phrase.end}
                                onIonChange={e => setPhrase(p => ({ ...p, end: Math.max(e.detail.value as number, phrase.start + 0.01) }))}
                            />
                            <IonButton expand="block" fill="outline" onClick={() => previewSegment(phrase.start, phrase.end)} style={{ marginTop: '12px' }}>
                                ▶️ Preview {label}
                            </IonButton>
                        </div>
                    ))}

                    <IonButton expand="block" onClick={saveTrimmedPhrases} style={{ marginTop: 24 }}>
                        💾 Save Both Phrases
                    </IonButton>

                    {message && (
                        <IonText color="danger" style={{ display: 'block', marginTop: '16px' }}>{message}</IonText>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default EditRecording;
