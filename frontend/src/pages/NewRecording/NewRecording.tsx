import React, { useState, useRef } from 'react';
import { IonPage, IonContent, IonButton, IonText, IonIcon } from '@ionic/react';
import { micOutline, libraryOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import './NewRecording.css';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';

const API_URL = 'http://localhost:3001';

const NewRecording: React.FC = () => {
    const [recording, setRecording] = useState<MediaRecorder | null>(null);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const chunks = useRef<Blob[]>([]);
    const router = useIonRouter();

    // Get auth token from localStorage
    const authToken = localStorage.getItem('authToken');

    const startRecording = async () => {
        setMessage('');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new window.MediaRecorder(stream);
        chunks.current = [];
        mediaRecorder.ondataavailable = (e: BlobEvent) => {
            chunks.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks.current, { type: 'audio/webm' });
            setAudioURL(URL.createObjectURL(blob));
            uploadAudio(blob);
        };
        setRecording(mediaRecorder);
        mediaRecorder.start();
    };

    const stopRecording = () => {
        if (recording) {
            recording.stop();
            setRecording(null);
        }
    };

    const uploadAudio = async (blob: Blob) => {
        setIsUploading(true);
        setMessage('Uploading...');
        const formData = new FormData();
        formData.append('audio', blob, `recording-${Date.now()}.webm`);

        try {
            // 1. Upload audio file to backend
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                setMessage('Audio upload failed.');
                setIsUploading(false);
                return;
            }

            const data = await response.json(); // <- THIS GIVES YOU THE TRUE FILENAME
            setMessage('Audio uploaded. Saving to library...');

            // 2. Save recording metadata to MongoDB, use real backend filename
            const saveMeta = await fetch(`${API_URL}/api/recordings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ filename: data.filename }), // <--
            });

            if (!saveMeta.ok) {
                setMessage('Failed to save recording metadata.');
            } else {
                setMessage('Recording saved to library!');
            }
        } catch (error) {
            setMessage('Error saving recording.');
        }
        setIsUploading(false);
    };

    return (
        <IonPage>
            <IonContent fullscreen className="recording-page">
                <div className="recording-container">
                    <div className="recording-nav">
                        <IonButton fill="clear" onClick={() => router.push('/dashboard')} className="nav-btn">
                            <span style={{ fontSize: "2rem", fontWeight: "bold" }}>&larr;</span>
                        </IonButton>
                        {/* <IonButton fill="clear" onClick={() => router.push('/recording-library')} className="nav-btn">
                            <IonIcon icon={libraryOutline} />
                        </IonButton> */}
                         <ProfileIcon />
                    </div>
                    <IonText className="recording-title">New Recording</IonText>
                    <div className="recording-mic-wrapper">
                        <IonIcon icon={micOutline} className="recording-mic-icon" />
                    </div>
                    <IonText className="recording-instruction">
                        Record the speaker,<br />then extract the useful part
                    </IonText>
                    {recording ? (
                        <IonButton expand="block" fill="clear" color="danger" onClick={stopRecording} className="recording-btn">
                            Stop Recording
                        </IonButton>
                    ) : (
                        <IonButton expand="block" fill="clear" onClick={startRecording} className="recording-btn">
                            Start Recording
                        </IonButton>
                    )}
                    {isUploading && <div className="recording-message">Saving...</div>}
                    {message && <div className="recording-message">{message}</div>}
                    {audioURL && <audio controls src={audioURL} style={{ marginTop: 10 }} />}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default NewRecording;